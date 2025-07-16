const mongoose = require('mongoose');
const APICredit = require('../models/apiCredit');
const Subscription = require('../models/subscription');

class CreditService {
  constructor() {
    this.MODEL_COSTS = {
      'gpt-4': 0.00003,
      'claude-sonnet': 0.000025,
      'claude-heroku': 0.00002,
      'deepseek': 0.000015,
      'huggingface': 0.00001,
      'together-ai': 0.00002,
      'ollama': 0.00001,
      'deepinfra': 0.000015
    };

    this.COMPANY_SHARE = 0.3; // 30% company revenue
    this.API_SHARE = 0.7;    // 70% API credits
  }

  async handlePayment(amount, userId) {
    const companyShare = amount * this.COMPANY_SHARE;
    const apiShare = amount * this.API_SHARE;

    // Calculate credit distribution
    const distribution = this.calculateCreditDistribution(apiShare);
    
    // Record credits in database
    await this.recordCredits(userId, distribution, amount);

    return {
      companyRevenue: companyShare,
      apiCredits: distribution
    };
  }

  calculateCreditDistribution(apiAmount) {
    const distribution = {};
    const totalCost = Object.values(this.MODEL_COSTS).reduce((a, b) => a + b, 0);

    for (const [model, cost] of Object.entries(this.MODEL_COSTS)) {
      const share = cost / totalCost;
      const credits = Math.floor((apiAmount * share) / cost);
      distribution[model] = credits;
    }

    return distribution;
  }

  async recordCredits(userId, distribution, amount) {
    const credits = Object.entries(distribution).map(([model, credits]) => ({
      userId,
      model,
      credits,
      creditType: 'subscription',
      purchaseAmount: amount * this.API_SHARE * (credits / Object.values(distribution).reduce((a, b) => a + b, 0))
    }));

    await APICredit.insertMany(credits);
    
    // Update user's subscription credits
    await Subscription.findOneAndUpdate(
      { userId },
      { $inc: { 'credits.available': distribution } }
    );
  }

  async checkCredits(userId, model) {
    const subscription = await Subscription.findOne({ userId });
    return subscription?.credits?.available[model] || 0;
  }

  async deductCredits(userId, model, amount = 1) {
    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription || subscription.credits.available[model] < amount) {
      throw new Error('Insufficient credits');
    }

    const update = {
      $inc: { [`credits.available.${model}`]: -amount },
      $push: {
        'credits.usage': {
          model,
          used: amount,
          date: new Date()
        }
      }
    };

    await Subscription.findOneAndUpdate({ userId }, update);
    return true;
  }

  async monitorCredits() {
    const subscriptions = await Subscription.find({ status: 'active' });
    
    for (const subscription of subscriptions) {
      const credits = subscription.credits.available;
      
      for (const [model, amount] of Object.entries(credits)) {
        // Alert if credits below 20%
        if (amount < (subscription.credits.allocation[model] * 0.2)) {
          // Implement your alert mechanism here
          console.log(`Low credits alert: ${subscription.userId} - ${model}`);
        }
      }
    }
  }
}

module.exports = new CreditService();