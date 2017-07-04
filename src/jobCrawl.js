var config = require("../config.json")
var crawlho = require('crawlho');
var request = require('request');
var Horseman = require('node-horseman');
var admin = require('firebase-admin')
var baseUrl = config.baseUrl;
var searchTerm = config.searchTerm;
var dbURL = config.databaseURL;
var horsemanRequests = 0;
var horsemanCompletes = 0;
var jobArray = []
var jobTitles = [];


//var serviceAccount = require("../keys.json");

admin.initializeApp({
    credential: admin.credential.cert(config),
    databaseURL: dbURL
});



var db = admin.database();


db.ref("jobs").remove();
db.ref("descriptions").remove();
db.ref("keywords").remove();




console.log("about to crawl...");


crawlho({

    url: baseUrl + searchTerm,
    debug: false, //mandatory
    maxlevel: 2,
    delay: 50,
    extract: function ($) { //mandatory
        var results = [];
        $('[href*="/job"]').each(function () {
            results.push($(this));
        });

        //You should return the data you wanna grab in form of an array!


        return results;
    },
    onResult: function (results) {

        results.forEach(function (result) {
            jobLink = result[0].attribs.href;
            //goHorseman(jobLink);
            jobArray.push(jobLink);


        })

        // pageData.push(jobLink);
        horsemanRequests++;
        console.log("job array: ", jobArray.length);
        //console.log(results.length);

    },
    shouldResetLevel: function (url) {
        if (url.includes("?page=")) {
            //console.log("reset level");
            return false;
        }
        return false;
    },
    shouldFollow: function (url) {
        if (url.includes("?page=")) {
            // console.log("shouldfollow= true",url)
            return true;
        }
        //    console.log("should not follow",url)
        return false;
    }


}, function (err) {
    if (err) {
        throw err; //Something went wrong!
        console.log(err);
    }
    else {
       var qty = jobArray.length;

        var counter = 0;
        // delayedHorse(jobArray[5]);
        function next() {
            if (counter < qty) {
                delayedHorse(jobArray[counter]);
                counter++
                setTimeout(next, 5000);
            }
        }
        next();
    }
});

function delayedHorse(job) {
    goHorseman(job);

}


function goHorseman(jobUrl) {
//  var db = admin.database();
var jobsRef = db.ref("jobs");
var descriptionsRef = db.ref("descriptions");
var keyWordsRef = db.ref("keywords");
var watchListRef = db.ref("watchlist");

    var title = '';
    var date = '';

    var horseman = new Horseman({
        timeout: 10000,
        interval: 1000,
        switchToNewTab: true,
        injectBluebird: true,
        phantomOptions: {
            "load-images": false,
            "debug": true
        }
    });

    horseman
        .on('loadStarted', function () {
            //  console.log("started load for:",i);
        })
        .on('error', function (msg, trace) {
            // console.log("error",msg)
        })
        .on('timeout', function (msg) {
            console.log("timeoutError", baseUrl + jobUrl);
            horseman.close();
        })
        .on('loadFinished', function (status) {
            //  console.log(status + "load finished for: " + i)
        })

        .open((baseUrl + jobUrl))

        .waitForSelector("h1", { timeout: 30000 })
        .text("h1")
        .then(function (t) {
            title = t;
        })
        .waitForSelector("[itemprop=datePosted]", { timeout: 30000 })
        .text("[itemprop=datePosted]")
        .then(function (d) {
            date = d;
        })
        .waitForSelector("#jobTemplate", { timeout: 30000 })
        .text("#jobTemplate")
        .then(function (text) {
            text = removeComments(text);
            jobTitles.push(text);
            console.log("jobs done:" + jobTitles.length + " of: ", jobArray.length);
            var keyRef = jobsRef.push({
                jobPath: baseUrl + jobUrl,
                jobTitle: title,
                datePosted: date

            }

            ).key

            descriptionsRef.child(keyRef).set({
                jobDescription: text

            })



            var wordsArray = text.split(/[\s-]/);
            for (var i = 0; i < wordsArray.length; i++) {
                //check if word exists in database.

                if (wordsArray[i].length != 0 || wordsArray[i] != "") {
                    let massagedWord = massage(wordsArray[i])
                    if (massagedWord.length != 0 && massagedWord != "") {

                 keyWordsRef.child(massagedWord).child("members").update({[keyRef]:true})


                 watchListRef.once("value")
                  .then(function(snapshot){
                    if(snapshot.child(massagedWord).exists()){
                      //add this as a property in the keywords data
                      keyWordsRef.child(massagedWord).update({isWatchList:true})

                    }
                  });


                    }
                }
            }//end of For Loop
            //
        })
        .then(function(){
            console.log("counting words...");

        })


        .finally(function () {
            if (jobTitles.length == jobArray.length) {
                console.log("completed Dump.... obtaining metadata")



                db.goOffline();
            }

            horseman.close()
        });


}
function massage(word) {
    word = word.replace(/#/, 'sharp').toLocaleLowerCase();
    word = word.replace(/\+\+/, 'plusplus').toLocaleLowerCase();

    word = word.replace(/[^a-zA-Z]/g, '').toLocaleLowerCase();
    return word;
}

function removeComments(text) {
    splitter = "-->";
    if (text.includes(splitter)) {
        textArray = text.split(splitter);
        return textArray[1].trim();
    } else {
        return text.trim();
    }


}
