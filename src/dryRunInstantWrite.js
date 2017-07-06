var mysql = require('mysql');
var config = require('../config.json')
var watchlistjson = require('../watchlist.json')



exports.populateFirebase = function(db){
  var watchListRef = db.ref("watchlist");
  var keyWordsRef = db.ref();
console.log("____Populating Firebase____");
//gather data to sequentially input into firebase:
var conn = mysql.createConnection({
  host: config.mysqlhost,
  user: config.mysqluser,
  password: config.mysqlpassword,
  database: config.mysqldatabase,
  multipleStatements: true

});


   var dataToWrite ={
                      "keywords":{},
                      "jobs":{}
                    };
var sql = 'select * from sqlwords;select * from jobs';
             conn.query(sql, function (err, results, fields) {
                 if(err) throw err;
                 conn.end();
                 console.log(results[1]);

                 results[1].forEach(function(result){
                dataToWrite["jobs"][result.id] = {
                     jobTitle: result.jobTitle,
                     jobLink: result.jobLink
                   }


                 });


              results[0].forEach(function(result){
                var word = result.theword;
                var f = result.frequency;
                //console.log(result.theword + ":" + result.frequency)
                //check if its in watchlist file

              if(watchlistjson.hasOwnProperty(word)){


                dataToWrite["keywords"][word] = {"watchlist":true,"members_count":f};
              //  console.log("adding to watchlist")
            }
            else{
              dataToWrite["keywords"][word] = {"watchlist":false,"members_count":f};
            }

              });
              keyWordsRef.set(dataToWrite,function(){
                db.goOffline();

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
  connection.query(
  'drop table if exists sqlwords;drop table if exists jobs;\
  create table sqlwords (theword VARCHAR(100),frequency INT DEFAULT 1,\
  PRIMARY KEY(theword));create table jobs (id int not null auto_increment,\
    jobTitle varchar(500),jobLink varChar(500),Primary key (id))',

  function(err,rows,fields){
console.warn("got into query")
    connection.release();
      if(err) throw err;
      pool.end(function(err){
        console.log("ended pool connection")
      //  process.exit();
      });

// };
  });
});

};
