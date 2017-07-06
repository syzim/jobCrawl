var  server = require ('http').createServer();
var io = require('socket.io')(server);
//var fork = require('child_process').fork;
var child = require('child_process');
var crawlRunning = false;

  // child.stdio.on('data', function(data) {
  //   console.log("--JOBCRAWL--" + data)
  // });

var clientCount=0;
io.on('connection',function(client){
  console.log("Client connected");
  clientCount++
if(crawlRunning == true){
  io.emit('crawling',"Crawl in process");
}
  io.emit('message',clientCount);
  client.on('disconnect',function(){
    console.log("Client Disconnected");
    clientCount--;
    io.emit('message',clientCount);
  });

  client.on("startCrawl",function(){
    console.log("Received request to crawl :)")
    crawlRunning = true;
    io.emit('crawling',"Crawl in process");
    var crawler = child.fork('./jobCrawl.js',[],{
      stdio:'pipe'
    });

    crawler.on('close', function(){
      console.log("crwaler finished")
      io.emit('crawlfinished',"Crawl has finished")
      crawlRunning = false;
    });
    });


  });


server.listen(3050)
console.log("server listening on 3050")
