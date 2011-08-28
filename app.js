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
var mongoose = require('mongoose');

if(!process.env.PORT){
  mongoose.connect('mongodb://localhost/scorepad');
}else{
  mongoose.connect('mongodb://heroku_app820700:4e0pmkpmrvj2spvncop65kd2qn@dbh35.mongolab.com:27357/heroku_app820700');
}
var Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

var User = new Schema({
    user    : ObjectId
  , facebook_id     : Number
  , wins      : Number
  , losses      : Number
});

var Game = new Schema({
  game : ObjectId,
  users : [User]
});

var UserModel = mongoose.model('User', User);
/* SAMPLE USER MODEL UPDATE
var user = new UserModel();
user.facebook_id = 119292929;
user.wins = 10;
user.losses = 4;
user.save(function(err) {
  console.log(err);
});
*/

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
  console.log("APP GET /");
  console.log("COOKIES: ", req.cookies);
  console.log("SESSION: ", req.session);
  var f_user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  console.log("FACEBOOK USER: ", f_user);
  if (f_user) {
    // If Logged in grab the graph data
    var graph = new facebook.GraphAPI(f_user['access_token']);
    graph.getObject('me', function(error, f_user){
      if(error){
        console.log("Something happend grabbing Facebook graph!");
        res.clearCookie();
        res.redirect('/');
      }else{
        //Check the DB for a user
        console.log("user: ", f_user);
        console.log("GAMES COUNT:", Object.keys(GAMES).length);
        var games = false;
        var user_has_game = false;
        if(Object.keys(GAMES).length > 0){
          games = true;
        }
        if(GAMES[f_user.id]){
          var user_has_game = true;
        }
        UserModel.findOne({ facebook_id: f_user.id}, function (err, db_user){
          if(db_user){
            //GO AHEAD
            console.log(db_user);
            f_user.wins = db_user.wins;
            f_user.losses = db_user.losses;
            res.render('welcome', {title: 'Welcome', user: f_user, games: games, user_has_game: user_has_game});
          }else{
            //Create the user
            var user = new UserModel();
            user.facebook_id = f_user.id;
            user.wins = 0;
            f_user.wins = 0; //THIS WAS NOT .WINS FOR SOME REASON???
            user.losses = 0;
            f_user.losses = 0;
            user.save(function(err) {
              console.log(err);
              //Load the logged in home page
              res.render('welcome', {title: 'Welcome', user: f_user, games: games, user_has_game: user_has_game});
            });
          }
        });
      }
    });
  } else {
    res.render('index', { title: 'Log-in' });
  }
});


app.get('/post/', function(req, res){
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  if (user) {
    var graph = new facebook.GraphAPI(user['access_token']);
    function print(error, data) {
        console.log(error || data);
    }
    //graph.getObject('me', print);
    //graph.getConnections('me', 'friends', print);
    graph.putObject('me', 'feed', {message: 'I just dominated my opponents! Check out the http://nko2-sewercity.herokuapp.com ScorePad app so you can track your wins and losses.'}, print);
    res.redirect('/');
  }
});


app.get('/game/:action', function(req, res){
  // Check if the user is logged in to Facebook 
  //console.log("COOKIES: ", req.cookies);
  //console.log("SESSION: ", req.session);
  console.log("REQUESTED /GAME/", req.params.action);
  var slug = req.params.slug;
  var action = req.params.action;
  var user = facebook.getUserFromCookie(req.cookies, FB_APP_ID, FB_APP_SECRET);
  console.log(user);
  if (user) {
    // If Logged in grab the graph data
    var graph = new facebook.GraphAPI(user['access_token']);
    graph.getObject('me', function(error, user){
      if(error || !user || !user.id){
        console.log("Error with Facebook Cookie", error);
        res.redirect('/');
      }else{
       console.log("USER: ", user); 
        if (action=="start"){
          //Starts a new game - also can clear a users game already in progress
          //Users only allowed one game at a time
          GAMES[user.id] = {owner: user.name, players: {} };
          console.log("Current GAME: ", GAMES[user.id]);
          user.score = 0;
          GAMES[user.id].players[user.id] = {details: user };
          console.log("ALL GAMES: ", GAMES);
          res.redirect('/game/' + user.id);
        }else if(action=="join"){
          //Need to find current games then parse it for friends
          //Display a list of friends playing then they can select to join
          console.log("Parse Current Games for Friend ID's!", GAMES);        
          _.each(GAMES, function(key, game){
            console.log("KEY: ", key);
            console.log(game);
          });
          res.render('join', {title: 'Join a Game', games: GAMES});
        }else{
          console.log("LOGGED IN AND SOMETHING ELSE!");
          console.log(GAMES[req.params.action]);
          //ADD PLAYER TO GAME OBJECT
          var game_id = req.params.action;
          console.log("GAME_ID: ", game_id);
          if(GAMES[game_id]){
            //GAMES[game_id]["current_user_id"] == user.id;
            //GAMES[game_id]["current_user_name"] == user.name;
            if(GAMES[game_id].players[user.id]){
             // _.extend(GAMES[game_id].players[user.id], {current_user: true});
            }else{
              console.log("setting up game for newcommer");
              user.score = 0;
              GAMES[game_id].players[user.id] = {details: user };
            }
          }else{
            GAMES[user.id] = {owner: user.name, players: {} };
            console.log("Current GAME: ", GAMES[user.id]);
            GAMES[user.id].players[user.id] = {details: user };
          }
          _.each(GAMES, function(game){
            console.log(game);
          });
          res.render('game', {title: 'Game ' + req.params.action, current_user_id: user.id, current_user_name: user.name, game_id: game_id, game: GAMES[game_id]});
        }
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
  io.set("polling duration", 15);
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
    console.log("Socket Request -> Updated Score");
    console.log('Score: ', score);
    GAMES[score.gameId].players[score.player].details.score = score.score;
    socket.broadcast.to(score.gameId).emit('score-push', score);
    if(score.winner){
      //update the users wins
      //TODO - Also need to update the losses!
      //TODO - Post the score to Facebook!
      _.each(GAMES[score.gameId].players, function(player, player_id){
        console.log(player, player_id);
        UserModel.findOne({ facebook_id: player_id}, function (err, user){
          if(!err){
            console.log(user);
            if(player_id==score.winner){
              user.wins = user.wins + 1;
            }else{
              user.losses = user.losses + 1;
            }
            user.save(function(err){
              if(err){
                console.log(err);
              }else{
                console.log("Winner updated!", user);
              }
            });
            delete GAMES[score.gameId];
            console.log(GAMES);
          }else{
            console.log("WINNER COULD NOT BE FOUND!");
          }
        });
      });
    }
  });

  socket.on('add player', function(player) {
    socket.broadcast.to(player.gameId).emit('player add', player);
  });

});

