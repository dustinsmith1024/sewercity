var sys = require('sys');
var util = require('util');
var exec = require("child_process").exec;
var os = require('os');
var fs = require('fs');
var express = require('express');
var app = express.createServer();
var io = require('socket.io');
var _ = require('underscore')._;
var facebook = require('facebook-graph');
nko = require('nko')('dHprko2dt540/Tp2');

var FB_APP_ID = '112933112052348';
var FB_APP_SECRET = 'e1b0f67995f2f3840ebf5ef46b677083';
var GAMES = {};

app.configure(function(){
    app.use(express.methodOverride());
    app.use(express.logger());
    app.use(express.cookieParser());
    app.use(express.session({ secret: "scoreThisB" }));
    app.use(express.bodyParser());
    app.use(app.router);
    app.set('view engine', 'jade');
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
  // Check if the user is logged in to Facebook
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  if (user) {
    // If Logged in grab the graph data
    var graph = new facebook.GraphAPI(user['access_token']);
    graph.getObject('me', function(error, user){
      console.log(user.id);
      //Load the logged in home page
      res.render('welcome', {title: 'Welcome', user: user});
    });
  } else {
    res.render('index', { title: 'Log-in' });
  }
});


app.get('/game/:action', function(req, res){
  // Check if the user is logged in to Facebook 
  var slug = req.params.slug;
  var action = req.params.action;
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  if (user) {
    // If Logged in grab the graph data
    var graph = new facebook.GraphAPI(user['access_token']);
    graph.getObject('me', function(error, user){
      console.log(user.id); 
      if (action=="start"){
        GAMES[user.id] = {id: user.id, owner: user.name };
        console.log(GAMES);
        res.redirect('/game/' + user.id);
      }else if(action=="join"){
        //Need to find current games then parse it for friends
        //Display a list of friends playing then they can select to join
        console.log("Parse Current Games for Friend ID's!");
        res.render('join', {title: 'Join a Game', games: GAMES});
      }else{
        console.log("LOGGED IN AND SOMETHING ELSE!");
        console.log(GAMES[req.params.action]);
        res.render('game', {title: 'Game ' + req.params.action, game: GAMES[req.params.action]});
      }
    });
  } else {
    //Trying to access /game when not logged redirects to home!
    res.redirect('/');
  }
});

app.get('/oldies', function(req, res){
  fs.readFile(__dirname + '/public/index.html', 'utf8', function(err, text){
      res.send(text);
  });
});

/* FACEBOOK GRAPH DETAILS
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  if (user) {
    var graph = new facebook.GraphAPI(user['access_token']);
    function print(error, data) {
        console.log(error || data);
    }
    graph.getObject('me', print);
    graph.getConnections('me', 'friends', print);
    graph.putObject('me', 'feed', {message: 'The computerz iz writing on my wallz!1'}, print);

*/

var port = parseInt(process.env.PORT) || 3000;
app.listen(port);

io = io.listen(app);

//FOR HEROKU POLLING SITUATION
// assuming io is the Socket.IO server object
io.configure(function () {
  console.log("configuring");
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
});

io.sockets.on('connection', function(socket){
  console.log("Server Connection to Socket.io");
  
  socket.on('start game', function(game) {
    // Add the game to the socket
    // Add to global games list??
    socket.set('game', game, function(){
      console.log('Game Set:', game);
      socket.emit('game set');
    });
  });

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

