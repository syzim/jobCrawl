var config = require("../config.json")
var crawlho = require('./createJobSkeleton')
var Horseman = require('node-horseman');
var admin = require('firebase-admin')
var watchlistjson = require('../watchlist.json')
var baseUrl = config.baseUrl;
var searchTerm = config.searchTerm;
var dbURL = config.databaseURL;
var mysql = require('mysql');


var jobTitles = [];

var _ = require('lodash');
var dryRun = require('./dryRun.js');

if(config.dryRun == false){
  //Deletes mysql database table ready for a new web crawl
dryRun.setupRDS();
}


admin.initializeApp({
    credential: admin.credential.cert(config),
    databaseURL: dbURL
});



var db = admin.database();


db.ref("jobs").remove();
db.ref("descriptions").remove();
db.ref("keywords").remove();




console.log("about to crawl...");

//crawl website for page links to items
if(config.dryRun == false){
crawlho.createJobSkeleton(function(jobArray){
  var qty = jobArray.length;
    //var qty = 1
    var counter = 0;
    // delayedHorse(jobArray[5]);
    function next() {
        if (counter < qty) {
            goHorseman(jobArray[counter],(counter + 1),jobArray);
            counter++
            setTimeout(next, 8000);
        }

    }
    next();

});

}

if(config.dryRun == true){
  console.log("in dry run")
  dryRun.populateFirebase(db);
  //db.goOffline();
}else{
  console.log("dry run set to false crawling web..")
}




function goHorseman(jobUrl,counter,jobArray) {
//  var db = admin.database();
var jobsRef = db.ref("jobs");
var descriptionsRef = db.ref("descriptions");
var keyWordsRef = db.ref("keywords");
var watchListRef = db.ref("watchlist");

    var title = '';
    var date = '';
    var savePath = '';
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
        .userAgent('Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0')

        .open((baseUrl + jobUrl))
        .screenshot(jobUrl + ".png")

        .waitForSelector(config.titleIdentifier, { timeout: 6000 })
        .text(config.titleIdentifier)
        .then(function (t) {
            title = t;

        })
        // .waitForSelector("[itemprop=datePosted]", { timeout: 30000 })
        // .text("[itemprop=datePosted]")
        // .then(function (d) {
        //     date = d;
        // })
        .waitForSelector(config.bodyIdentifier, { timeout: 6000 })
        .html([config.bodyIdentifier],savePath)
        .text(config.bodyIdentifier)
        .then(function (text) {
          //todo write all text to a file
            text = removeComments(text);


            var jobObject = {
              jobTitle: title,
              jobLink: baseUrl + jobUrl

            }

            var keyRef = jobsRef.push(jobObject).key

            var pool = mysql.createPool({
              host: config.mysqlhost,
              user: config.mysqluser,
              password: config.mysqlpassword,
              database: config.mysqldatabase,
              multipleStatements: true

            });





            descriptionsRef.child(keyRef).set({
                jobDescription: text

            })
        //
        //
        //
            var wordsArray = text.split(/[\s-]/);
            var massagedWords = [];
            console.log("---------_ " +title+"_---------");



            for (let i = 0; i < wordsArray.length; i++) {
                //check if word exists in database.

                if (wordsArray[i].length != 0 || wordsArray[i] != "") {
                  let massagedWord = massage(wordsArray[i])

                    if (massagedWord.length != 0 && massagedWord != "") {
              //   keyWordsRef.child(massagedWord).child("members").update({[keyRef]:true})
                massagedWords.push(massagedWord)



              if(watchlistjson.hasOwnProperty(massagedWord)){
              //  console.log(massagedWord + " : is in watchlist")
                keyWordsRef.child(massagedWord).child("members").update({[keyRef]:true,"isWatchlist":true})

              }

                    }
                }

            }//end of For Loop
              jobTitles.push(text);
          var uniqueWords = _.uniq(massagedWords)
          var uniqueObject = [];


          var jobId;

  var sql = "insert into jobs set ?;select last_insert_id() as id"
//store job data and nest 2nd query to ensure no foreign key contstrains are broken.
pool.getConnection(function(err,connection){
  connection.query(sql,jobObject, function (err, results, fields) {
  if(err) throw err;
  results[1].forEach(function(result){
    jobId = result.id;
  })
  for(let i = 0;i<uniqueWords.length;i++){
    uniqueObject.push([uniqueWords[i],jobId]);
  }

   var sql = 'insert into sqlwords (theword,jobId) values ?';
                connection.query(sql,[uniqueObject], function (err, results, fields) {
                    if(err){
                    throw err;
                    }
                    connection.release();
                    pool.end();
                });
});
});

        })
        .finally(function () {
            if (jobTitles.length == jobArray.length) {
                console.log("completed Dump.")


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
