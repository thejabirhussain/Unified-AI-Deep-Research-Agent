// services/paymentDistributionService.js
class PaymentDistributionService {
  constructor() {
    this.COMPANY_SHARE = 0.3; // 30%
    this.API_CREDITS_SHARE = 0.7; // 70%
    
    // Cost per request for each model (in USD)
    this.MODEL_COSTS = {
      'gpt-4': 0.03,
      'claude-sonnet': 0.025,
      'claude-heroku': 0.02,
      'deepseek': 0.015,
      'huggingface': 0.01,
      'together-ai': 0.02,
      'ollama': 0.01,
      'deepinfra': 0.015
    };
  }

  distributePayment(paymentAmount, plan) {
    const companyShare = paymentAmount * this.COMPANY_SHARE;
    const apiCreditsShare = paymentAmount * this.API_CREDITS_SHARE;

    // Calculate credits for each model based on their costs
    const modelCredits = {};
    const totalModelCost = Object.values(this.MODEL_COSTS).reduce((a, b) => a + b, 0);

    for (const [model, cost] of Object.entries(this.MODEL_COSTS)) {
      const share = cost / totalModelCost;
      const credits = Math.floor((apiCreditsShare * share) / cost);
      modelCredits[model] = credits;
    }

    return {
      companyShare,
      apiCreditsShare,
      modelCredits
    };
  }
}