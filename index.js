'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook
/*
app.post('/webhook', (req, res) => {
    let body = req.body;

    // Checks this is an event from a page subscription
    if (body.object === 'page') {

      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {

        // Gets the message. entry.messaging is an array, but
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];
        console.log(webhook_event);
      });

      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    rest.sendStatus(404);
  }
});
*/
// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = process.env.VERIFY_TOKEN

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

/*===================================================================
Database connection with mongoose
===================================================================*/
var mongoose = require("mongoose");
var db = mongoose.connect(process.env.MONGODB_URI)
var Music = require("./models/music")

/*===================================================================
Postback message processing
===================================================================*/
// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function (req, res) {
  let body = req.body
  // Make sure this is a page subscription
  if (body.object == "page") {
    // Iterate over each entry
    // There may be multiple entries if batched
    body.entry.forEach(function(entry) {
      let webhook_event = entry.messaging(0)
      log.console(webhook_event)
      // Iterate over each messaging event
      if (entry.messaging)  {
        entry.messaging.forEach(function(event) {
          if (event.postback) {
            processPostback(event);
          } else if (event.message) {
            processMessage(event);
          }
        });
      }
    });

    res.sendStatus(200);
  }
});

function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: "https://graph.facebook.com/v2.6/" + senderId,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: "first_name"
      },
      method: "GET"
    }, function(error, response, body) {
      var greeting = "";
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = "Hi " + name + ". ";
      }
      var message = greeting + "My name is Theo Music Bot, my purpose is to keep you update about new song releases by your favorite artists! Get started by giving me a name"
      sendMessage(senderId, {text: message});
    });
  }
}

function processMessage(event) {
  if (!event.message.is_echo){
    var message = event.message;
    var senderId = event.sender.id;
    console.log("Received message from sender.id: " + senderId);
    console.log("Message is: " + JSON.stringify(message));
    // Message processing, attachment processing found below
    if (message.text) {
      var formattedMsg = message.text.toLowerCase().trim();
      switch (formattedMsg) {
        case "artist":
        case "album":
          getArtistDetail(senderId, formattedMsg);
          break;
        default:
          findArtist(senderId, formattedMsg);
      }
    } else if (message.attachments) {
      sendMessage(senderId, {text: "Sorry, I don't support attachments."})
    }
  }
}
// sends message to user
function sendMessage(recipientId, message) {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: message,
    }
  }, function(error, response, body) {
    if (error) {
      console.log("Error sending message: " + response.error);
    }
  });
}

function getArtistDetail(userId, field) {
  Music.findOne({user_id: userId}, function(err, music) {
    if(err) {
      sendMessage(userId, {text: "Unable to find artist, try again"});
    } else {
      sendMessage(userId, {text: "Attempting to find an artist... "});
      sendMessage(userId, {text: music[field]});
    }
  });
}
function findArtist(senderId, formattedMsg) {
  var cb
  searchSpotify(formattedMsg, 'artist', cb);
  log.console(cb)
  var object = JSON.parse(cb);
  log.console(object)
  var spotifyLink = object.spotify;
  sendMessage(senderID, {text: "Is this, the correct artist: " + spotifyLink})
}

function searchSpotify(formattedMsg, type, cb) {
  const {exec} = require('child_process');
  var oAuth = '-H \"Accept: application/json\" -H \"Authorization: Bearer BQAjs0Y5Bv3QdbSyQpv68CMu5Y4GuRV-uhSnTUyH9NuyqpSa8adk89mJs5AjxWzPqCC5QCWpxh2CQ6pOLWZ17aMb9nuLsgNFhaCAD85QT_OfTdiCw4owFBGN0xOi0wF-pi49_OtFb_XtfQNgjqTSRwH-BQCgYKh0KwIXmBsDPw5MjBa41F8e1LxfhKHa3mCLpKKzhnkInw4rrwl1-CFGG7IBoGYDZEE1F_mi-Gdkxdi1wtNdsvuLM44I_X1jOgpk6JTNzM7D2Kg8OlMKvBZVfYLnMokEVpEw9N9KaSgVMo\"'
  var tool = 'curl -X GET'
  var spotifyLink = '\"' + 'https://api.spotify.com/v1/search?q=' + formattedMsg + '&type=' + type +'\" '
  exec(tool + spotifyLink + oAuth , (err, stdout, stderr) => {
    console.log("exec command line: " + tool + spotifyLink + oAuth)
    if (err) {
      console.log("Error searching spotify")
    } else {
      cb = stdout;
    }
  });
}
