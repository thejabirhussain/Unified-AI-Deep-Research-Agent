const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'inactive'
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    required: true
  },
  price: Number,
  startDate: Date,
  endDate: Date,
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  autoRenew: {
    type: Boolean,
    default: true
  },
  credits: {
    available: {
      'gpt-4': { type: Number, default: 0 },
      'claude-sonnet': { type: Number, default: 0 },
      'claude-heroku': { type: Number, default: 0 },
      'deepseek': { type: Number, default: 0 },
      'huggingface': { type: Number, default: 0 },
      'together-ai': { type: Number, default: 0 },
      'ollama': { type: Number, default: 0 },
      'deepinfra': { type: Number, default: 0 }
    },
    usage: [{
      model: String,
      used: Number,
      date: Date
    }]
  }
});

module.exports = mongoose.model('Subscription', subscriptionSchema);