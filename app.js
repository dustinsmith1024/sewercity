var sys = require('sys');
var exec = require("child_process").exec;
var os = require('os');
var fs = require('fs');
var express = require('express');
var app = express.createServer();
var io = require('socket.io');
var _ = require('underscore')._;
nko = require('nko')('dHprko2dt540/Tp2');

var FB_APP_ID = '112933112052348';
var FB_APP_SECRET = 'e1b0f67995f2f3840ebf5ef46b677083';
app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "scoreThisB" }));
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

var facebook = require('facebook-graph');
var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
if (user) {
    var graph = new facebook.GraphAPI(user['access_token']);
    function print(error, data) {
        console.log(error || data);
    }
    graph.getObject('me', print);
    graph.getConnections('me', 'friends', print);
   // graph.putObject('me', 'feed', {message: 'The computerz iz writing on my wallz!1'}, print);
}
  fs.readFile(__dirname + '/public/index.html', 'utf8', function(err, text){
      res.send(text);
  });
});


app.get('/', function(req, res){
  console.log("/ requested");
//#  console.log(typeof(req.cookies["fbs_" + FB_APP_ID]));
//#  console.log(req.cookies["fbs_" + FB_APP_ID].access_token);
//#  var fb_cookie = req.cookies["fbs_" + FB_APP_ID];
  //DECODE THIS
//#  console.log('https://graph.facebook.com/me?access_token=' + fb_cookie['access_token']);

  fs.readFile(__dirname + '/public/index.html', 'utf8', function(err, text){
      res.send(text);
  });
});


app.get('/login', function(req, res) {
  console.log("Initiate Fbook login");
});


app.get('/game/:game_id', function(req, res) {
  console.log("gamer", req.params.game_id); 
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

