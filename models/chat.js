const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  content: {
    type: String,
    required: true
  },
  model: String,
  mood: String,
  includeWebSearch: {
    type: Boolean,
    default: false
  },
  searchType: {
    type: String,
    enum: ['nws', 'isch', 'vid', 'web', 'scholar'], // Added 'scholar'
    default: 'web'  // Set a default value
  }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: String,
  messages: [messageSchema]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema);