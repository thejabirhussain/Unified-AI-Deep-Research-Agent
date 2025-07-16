const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Chat = require('../models/Chat');

router.get('/metrics', ensureAdmin, async (req, res) => {
  const metrics = {
    totalUsers: await User.countDocuments(),
    activeUsers: await User.countDocuments({ 'subscription.status': 'active' }),
    monthlyRevenue: await calculateRevenue(),
    modelUsage: await getModelUsageStats(),
    apiUsage: await getApiUsageStats()
  };
  
  res.json(metrics);
});

async function calculateRevenue() {
  // Implement revenue calculation
}

async function getModelUsageStats() {
  // Aggregate model usage from chat records
}

async function getApiUsageStats() {
  // Aggregate API usage metrics
}