require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { checkAccess } = require('./middlewares/subscriptionMiddleware');
require('./services/cronJobs');

const creditMonitorService = require('./services/creditMonitorService');

// Apply middleware to protected routes
app.use('/api/chat', checkAccess);

// Start credit monitoring
creditMonitorService.startMonitoring();