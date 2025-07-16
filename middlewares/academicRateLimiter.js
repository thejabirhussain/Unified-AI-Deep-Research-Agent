const rateLimit = require('express-rate-limit');

module.exports = {
  semanticScholarLimiter: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Semantic Scholar's limit
    message: 'Too many requests to Semantic Scholar API'
  }),
  arxivLimiter: rateLimit({
    windowMs: 3000, // 3 seconds
    max: 1, // arXiv's limit
    message: 'Too many requests to arXiv API'
  }),
  crossrefLimiter: rateLimit({
    windowMs: 1000, // 1 second
    max: 50, // CrossRef's limit
    message: 'Too many requests to CrossRef API'
  })
};