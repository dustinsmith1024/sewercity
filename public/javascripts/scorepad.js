$(document).ready(function() {
//alert("supp?");
var ACTIVE_PLAYER=0;

if(window.location.host=="localhost:3000"){
  var socket = io.connect('http://localhost:3000');
  var FB_APP_ID = '213668642020319';
}else{
  var FB_APP_ID = '112933112052348';
  var socket = io.connect('http://nko2-sewercity.herokuapp.com/');
}

socket.on('disconnect', function(){
  console.log("Server Connection Dropped!");
});

function gameId(){
  var game_id = $("#game-id").val();
  if (game_id && game_id!=""){
    return game_id;
  }else{
    return false;
  }
}
socket.on('connect', function(){
  console.log("Connected to server via socketastics");
  if(gameId()){
    socket.emit('join game', {id:gameId()});
  }
});

if($("#fb-root").length){
//if(!process.env.PORT){
//  var FB_APP_ID_TEST = '213668642020319';
//  var FB_APP_SECRET_TEST = '934dde24ecbd28336a105a9881bee8d1';
  FB.init({
    appId: FB_APP_ID, cookie:true,
    status:true, xfbml:true
  });

  FB.api('/me', function(user) {
    if(user != null) {
      // var image = document.getElementById('image');
      // image.src = 'https://graph.facebook.com/' + user.id + '/picture';
      // var name = document.getElementById('name');
      // name.innerHTML = user.name
    }
  });

}
socket.on('score-push', function(data) {
    console.log('Received: ', data);
    $p = $("tr#player-" + data.player);
    $p.find(".score").text(data.score);
    $p.data("score", data.score);
});

socket.on('player add', function(data) {
  console.log('Recieved: ',  data);
  $("#player-list").append('<tr id="player-' + data.player + '" data-game-id=" '+ gameId() + '" data-player="' + data.player + '" data-player-name="' + data.playerName + '" data-score="0" ><td class="playerName">' + data.playerName + '</td><td class="score">' + data.score + '</td><td></td></tr>');
});

$("#player-actions > li > a").live("click", function(event) {
  event.preventDefault();
  if(ACTIVE_PLAYER!=0){
    var data = $(this).data();
    console.log(data);
    var $p = $("#player-list").find("tr#player-" + ACTIVE_PLAYER);
    console.log($p.data());
    var score = Number($p.data("score")) + Number(data.value);
    $p.data("score", score);
    $p.find(".score").text(score);
    socket.emit("update score", $p.data() );
  }else{
    console.log("NO PLAYER SELECTED!");
  }
});

$("a.update-score").click(function(event){
  event.preventDefault();
  var $p = $(this).parents("tr");
  var data = $p.data();
  data.score += 10;
  console.log("Sending: ", data);
  $p.find(".score").text(data.score);
  socket.emit("update score", data );
});

$("a.add-player").click(function(event){
  event.preventDefault();
  var name = prompt("Player Namer:", "");
  $pl = $("#player-list");
  var players = $pl.children().length + 1;
  $pl.append('<tr id="player-' + players + '" data-game-id=" '+ gameId() + '" data-player="' + players + '" data-player-name="' + name + '" data-score="0" ><td class="playerName" >' + name + '</td><td class="score">0</td><td></td></tr>');
  var data = $pl.find("tr:last").data();
  console.log("Added player: ", data);
  socket.emit("add player", data);

});

$("#player-list tr").live("click", function(event) {
  event.preventDefault();
  if($(this).hasClass("active") === false) {
    data = $(this).data();
    ACTIVE_PLAYER = data.player;
    console.log("clicked: ", data.player);
    $("#player-list > .active").removeClass("active");
    $(this).toggleClass("active");
  }else{
    $(this).removeClass("active");
    ACTIVE_PLAYER=0;
  }
});

function addPlayer(id, name){
  
}

});
