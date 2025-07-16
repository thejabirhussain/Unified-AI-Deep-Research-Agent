const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const creditService = require('../services/creditService');
const User = require('../models/user');

router.post('/stripe', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      await creditService.handlePayment(
        invoice.amount_paid / 100,
        invoice.customer
      );
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await User.findOneAndUpdate(
        { 'subscription.stripeId': subscription.id },
        {
          'subscription.status': 'cancelled',
          'subscription.endDate': new Date()
        }
      );
      break;
  }

  res.json({received: true});
});

module.exports = router;