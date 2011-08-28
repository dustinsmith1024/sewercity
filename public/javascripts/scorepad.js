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
  var data = $("#player-list tr.current").data();
  if(gameId()){
    socket.emit('join game', data);
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
    if(data.winner){
      var $p = $("#player-list").find("tr.current");
      if($p.data("player")==data.winner){
        alert("Congrats " + $p.data("playerName") + " you are the Champ!");
      }else{
        alert("Sorry, " + data.winner_name + " is the Champ. Better luck next time.");
      }
      window.location = "/";
    }
    var diff = Number(data.score) - Number($p.find(".score").text());
    if(diff > 0){
      $p.find(".action").text("+" + diff).fadeIn("fast").fadeOut("slow");
    }else{
      $p.find(".action").text(diff).fadeIn("fast").fadeOut("slow");
    }
    $p = $("tr#player-" + data.player);
    $p.find(".score").text(data.score);
    $p.data("score", data.score);
});

socket.on('player add', function(data) {
  console.log('Recieved: ',  data.gameId);
  //check if user is already in
  if($("#player-" + data.player).length){
    console.log("already added!");
  }else{
    $("#player-list").append('<tr id="player-' + data.player + '" data-game-id=" '+ data.gameId + '" data-player="' + data.player + '" data-player-name="' + data.playerName + '" data-score="0" ><td class="selector"><input type="checkbox" /></td><td class="playerName">' + data.playerName + '</td><td class="score">' + data.score + '</td><td></td></tr>');
  }
});

$("#player-actions > li > a").live("click", function(event) {
  event.preventDefault();
  if(ACTIVE_PLAYER!=0){
    var data = $(this).data();
    console.log(data);
    if(data.value=="options"){
      //show complete thingy
      $("#player-edit-actions").slideToggle();
    }else{
      var $p = $("#player-list").find("tr#player-" + ACTIVE_PLAYER);
      console.log($p.data());
      var score = Number($p.data("score")) + Number(data.value);
      $p.data("score", score);
      if(data.value > 0){
        console.log(data.value);
        $p.find(".action span").text("+" + data.value).fadeIn("fast").fadeOut("slow");
      }else{
        console.log(data.value);
        $p.find(".action span").text(data.value).fadeIn("fast").fadeOut("slow");
      }
      $p.find(".score").text(score);
      socket.emit("update score", $p.data() );
    }
  }else{
    $("tr:not(:first)").addClass("highlight");
    setTimeout(function(){
      console.log("removing class");
      $("tr").removeClass("highlight");
    }, 700);
    console.log("NO PLAYER SELECTED!");
  }
});

$("#player-edit-actions > li > a").live("click", function(event) {
  event.preventDefault();
  if(ACTIVE_PLAYER!=0){
    var action = ($(this).attr("href"));
    console.log(data);
    var $p = $("#player-list").find("tr#player-" + ACTIVE_PLAYER);
    console.log($p.data());
    var score = Number($p.data("score"));
    $p.data("score", score);
    if(action=="#winner"){
      $p.data("winner", ACTIVE_PLAYER);
      $p.data("winner_name", $p.data("playerName"));
    }
    socket.emit("update score", $p.data() );
    if($p.hasClass("current")){
      alert("Congrats " + $p.data("playerName") + " you are the Champ!");
    }else{
      alert("Sorry, " + $p.data("playerName") + " is the Champ. Better luck next time.");
    }
    window.location = "/";
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

$("#player-list tr").live("click", function(event) {
  event.preventDefault();
  if($(this).hasClass("active") === false) {
    data = $(this).data();
    ACTIVE_PLAYER = data.player;
    console.log("clicked: ", data.player);
    $(this).find("input").removeAttr("checked");
    $(this).find("input").attr("checked","checked");
    $("#player-list > .active").removeClass("active");
    $(this).toggleClass("active");
    //$("#player-actions, #player-edit-actions").toggle("fast");
  }else{
    $(this).removeClass("active");
    $(this).find("input").removeAttr("checked");
    //$("#player-actions, #player-edit-actions").toggle("fast");
    ACTIVE_PLAYER=0;
  }
});

});
