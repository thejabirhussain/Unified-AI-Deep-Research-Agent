const mongoose = require('mongoose');

const apiCreditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  model: {
    type: String,
    required: true
  },
  credits: {
    type: Number,
    required: true
  },
  transactionId: String,
  purchaseAmount: Number,
  creditType: {
    type: String,
    enum: ['purchase', 'subscription', 'bonus'],
    default: 'purchase'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('APICredit', apiCreditSchema);