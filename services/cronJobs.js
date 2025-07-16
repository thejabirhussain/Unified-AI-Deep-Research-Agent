const cron = require('node-cron');
const creditService = require('./creditService');

// Run credit monitoring every hour
cron.schedule('0 * * * *', async () => {
  try {
    await creditService.monitorCredits();
  } catch (error) {
    console.error('Credit monitoring error:', error);
  }
});