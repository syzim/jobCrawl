var crawlho = require('crawlho');
var request = require('request');
var config = require('../config.json')
var baseUrl = config.baseUrl;
var searchTerm = config.searchTerm;
var dbURL = config.databaseURL;
var jobArray = []


exports.createJobSkeleton = function(callback){

crawlho({

    url: baseUrl + searchTerm,
    debug: false, //mandatory
    maxlevel: 2,
    delay: 50,
    extract: function ($) { //mandatory
        var results = [];
    //  $('[href*="rc/clk"]').each(function () {
     $('.result-title.hdrlnk').each(function () {
           results.push(this.attribs.href);
          // console.log("start:  " + this.attribs.href);
        });
    //  var core data = document.querySelectorAll('.turnstileLink' > a)

        //You should return the data you wanna grab in form of an array!


        return results;
    },
    onResult: function (results) {

        results.forEach(function (result) {
        var  jobLink = result;
            //goHorseman(jobLink);
           jobArray.push(jobLink);
          //  console.log("added "+ jobLink + "  to array");


        })


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
            return false;
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
    callback(jobArray);
    }
});
}
