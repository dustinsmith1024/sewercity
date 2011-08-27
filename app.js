var sys = require('sys');
var exec = require("child_process").exec;
var os = require('os');
var fs = require('fs');
var express = require('express');
var app = express.createServer();
var io = require('socket.io');
var _ = require('underscore')._;
nko = require('nko')('dHprko2dt540/Tp2');


app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.static(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  var oneYear = 31557600000;
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.get('/', function(req, res){
  console.log("/ requested");
  fs.readFile(__dirname + '/public/index.html', 'utf8', function(err, text){
      res.send(text);
  });
});

var port = parseInt(process.env.PORT) || 3000;
app.listen(port);

io = io.listen(app);
// assuming io is the Socket.IO server object
io.configure(function () {
  console.log("configuring");
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
});


io.sockets.on('connection', function(socket){
  console.log("Server Connection to Socket.io");
  
  socket.on('set username', function(name) {
    socket.set('username', name, function() {
      console.log("Username set");
      socket.emit("name set");
    });
  });

  socket.on('update score', function(score) {
      console.log('Score ' + score);
      socket.broadcast.emit('score-push', score);
  });

  socket.on('add player', function(player) {
    socket.broadcast.emit('player add', player);
  });
});

