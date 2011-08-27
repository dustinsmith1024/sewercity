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

if(!process.env.PORT){
  var FB_APP_ID = '213668642020319';
  var FB_APP_SECRET = '934dde24ecbd28336a105a9881bee8d1';
}else{
  var FB_APP_ID = '112933112052348';
  var FB_APP_SECRET = 'e1b0f67995f2f3840ebf5ef46b677083';
}
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
  console.log("COOKIES: ", req.cookies);
  console.log("SESSION: ", req.session);
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  console.log("USER: ", user);
  if (user) {
    // If Logged in grab the graph data
    var graph = new facebook.GraphAPI(user['access_token']);
    graph.getObject('me', function(error, user){
      console.log("user: ", user);
      //Load the logged in home page
      res.render('welcome', {title: 'Welcome', user: user});
    });
  } else {
    res.render('index', { title: 'Log-in' });
  }
});


app.get('/game/:action', function(req, res){
  // Check if the user is logged in to Facebook 
  //console.log("COOKIES: ", req.cookies);
  //console.log("SESSION: ", req.session);
  var slug = req.params.slug;
  var action = req.params.action;
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  if (user) {
    // If Logged in grab the graph data
    var graph = new facebook.GraphAPI(user['access_token']);
    graph.getObject('me', function(error, user){
      console.log("USER: ", user); 
      if (action=="start"){
        GAMES[user.id] = {owner: user.name, players: {} };
        console.log("Current GAME: ", GAMES[user.id]);
        GAMES[user.id].players[user.id] = {details: user };
        console.log("ALL GAMES: ", GAMES);
        res.redirect('/game/' + user.id);
      }else if(action=="join"){
        //Need to find current games then parse it for friends
        //Display a list of friends playing then they can select to join
        console.log("Parse Current Games for Friend ID's!", GAMES);
        res.render('join', {title: 'Join a Game', games: GAMES});
      }else{
        console.log("LOGGED IN AND SOMETHING ELSE!");
        console.log(GAMES[req.params.action]);
        //ADD PLAYER TO GAME OBJECT
        var game_id = req.params.action;
        console.log("GAME_ID: ", game_id);
        if(GAMES[game_id]){
          GAMES[game_id].players[user.id] = {details: user, current: true};
        }else{
          GAMES[user.id] = {owner: user.name, players: {} };
          console.log("Current GAME: ", GAMES[user.id]);
          GAMES[user.id].players[user.id] = {details: user };
        }
          _.each(GAMES, function(game){
            console.log(game);
          });
          res.render('game', {title: 'Game ' + req.params.action, current_user: user.id, game_id: game_id, game: GAMES[game_id]});
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

  socket.on('join game', function(player) {
    socket.join(player.gameId);
    console.log("Joined socket room: ", player.gameId);
    socket.broadcast.to(player.gameId).emit('player add', player);
    console.log("Someon joined a game!");
  }); 

  socket.on('start game', function(game) {
    // Add the game to the socket
    // Add to global games list??
    socket.set('game', game, function(){
      console.log('Game Set:', game);
      socket.emit('game set');
    });
  });

  socket.on('update score', function(score) {
      console.log('Score ' + score);
      socket.broadcast.to(score.gameId).emit('score-push', score);
  });

  socket.on('add player', function(player) {
    socket.broadcast.to(player.gameId).emit('player add', player);
  });

});

