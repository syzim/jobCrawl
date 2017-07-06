var mysql = require('mysql');
var config = require('../config.json')
var watchlistjson = require('../watchlist.json')




exports.populateFirebase = function(db){
  var watchListRef = db.ref("watchlist");
  var keyWordsRef = db.ref("keywords");
    var jobsRef = db.ref("jobs");
console.log("____Populating Firebase____");
//gather data to sequentially input into firebase:
var pool = mysql.createPool({
  host: config.mysqlhost,
  user: config.mysqluser,
  password: config.mysqlpassword,
  database: config.mysqldatabase,
  multipleStatements: true

});

var sql = 'select * from jobs';
        pool.getConnection(function(err,connection){
             connection.query(sql, function (err, results, fields) {
                 if(err) throw err;
                 connection.release();

                 var qty = results.length;
                   //var qty = 1
                   var counter = 0;
                   var keyWordData = {};
                   // delayedHorse(jobArray[5]);
                   function next() {
                       if (counter < qty) {
                         var jobKey = jobsRef.push({
                            jobId: results[counter].id,
                            jobTitle: results[counter].jobTitle,
                             jobLink: results[counter].jobLink
                         }).key;
                         var sql = 'select * from sqlwords where jobId = ?'
                         connection.query(sql,[results[counter].id],function(err,results){
                           if(err) throw err;
                           connection.release;
                            results.forEach(function(result){
//keyWordData["keywords"][result.theword]
                           if(watchlistjson.hasOwnProperty(result.theword)){
                           //  console.log(massagedWord + " : is in watchlist")
                             keyWordsRef.child(result.theword).child("members").update({[jobKey]:true,"isWatchlist":true},function(){
                              // db.goOffline();
                             })
                           }
                         });
                            });

                         }
                         else{
                           db.goOffline();
                           process.exit();

                         };
                         //

                           counter++
                           setTimeout(next, config.crawlDelay);
                       }

                   next();
          });

        });
      }


exports.setupRDS = function(){


console.log("got into RDS")
var pool = mysql.createPool({
  host: config.mysqlhost,
  user: config.mysqluser,
  password: config.mysqlpassword,
  database: config.mysqldatabase,
  connectionLimit:50,
  multipleStatements: true
});

pool.getConnection(function(err,connection){
  connection.query('set foreign_key_checks = 0;\
    drop table if exists sqlwords;drop table if exists jobs;\
    create table jobs (id int not null auto_increment,\
    jobTitle varchar(500),jobLink varChar(500),Primary key (id));\
    create table sqlwords (id int not null auto_increment,theword VARCHAR(100),jobId int not null,\
    PRIMARY KEY(id),foreign key (jobId)\
    references jobs(id) on delete cascade);SET FOREIGN_KEY_CHECKS = 1;'
,
  function(err,rows,fields){
console.warn("Dropped and Created SQL Tables........")
    connection.release();
      if(err) throw err;
      pool.end(function(err){
        console.log("ended pool connection..........")
      //  process.exit();
      });

// };
  });
});

};
