var mongoose = require("mongoose");
var Schema = mongoose.Schema

var MusicSchema = new Schema({
  user_id: {type: String},
  artist: {type: String},
  album: {type: String}
})

module.exports = mongoose.model("Music", MusicSchema);
