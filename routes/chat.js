const express = require('express');
const router = express.Router();
const fs = require('fs');
const Chat = require('../models/chat');
const aiService = require('../services/aiService');
const searchService = require('../services/searchService');
const downloadService = require('../services/downloadService');
const { AI_MODELS } = require('../services/aiService');
const multer = require('multer');
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Middleware to ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
};

// Add this middleware after ensureAuthenticated:
const validateChatOwnership = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat || chat.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    req.chat = chat;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/', ensureAuthenticated, async (req, res) => {
  const chats = await Chat.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.render('chatscreen', { user: req.user, chats });
});

router.post('/message', ensureAuthenticated, upload.array('files'), async (req, res) => {
  const { message, model, mood, includeWebSearch, searchType } = req.body;
  
  try {
    let chat = await Chat.findOne({ userId: req.user._id, title: message.substring(0, 30) });
    if (!chat) {
      chat = new Chat({
        userId: req.user._id,
        title: message.substring(0, 30),
        messages: []
      });
    }

    // Convert string 'true'/'false' to boolean
    const webSearchEnabled = includeWebSearch === 'true';
    
    chat.messages.push({ 
      role: 'user', 
      content: message, 
      model, 
      mood,
      includeWebSearch: webSearchEnabled,
      searchType: searchType // Add searchType
    });
    
    const aiResponse = await aiService.getResponse(
      message, 
      model, 
      mood,
      webSearchEnabled,
      searchType
    );

    // If academic search is requested
    if (webSearchEnabled && searchType === 'scholar') {
      const academicResults = await searchService.academicSearch(message, {
        num: 10,
        startYear: 2015
      });
      
      // Add academic results to the response
      aiResponse.academicResults = academicResults;
    }
    
    chat.messages.push({ 
      role: 'assistant', 
      content: aiResponse, 
      model, 
      mood,
      includeWebSearch: webSearchEnabled,
      searchType: searchType // Add searchType
    });
    
    await chat.save();

    res.json({ 
      response: aiResponse,
      chatId: chat._id 
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/voice', ensureAuthenticated, upload.single('audio'), async (req, res) => {
  // Handle voice message
  // Add voice processing logic here
});

// Then update the routes to use this middleware:
router.get('/history/:id', ensureAuthenticated, validateChatOwnership, async (req, res) => {
  res.json(req.chat);
});

router.delete('/delete/:id', ensureAuthenticated, validateChatOwnership, async (req, res) => {
  try {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ error: 'Failed to delete chat' });
  }
});

router.delete('/delete-all', ensureAuthenticated, async (req, res) => {
  try {
    await Chat.deleteMany({ userId: req.user._id });
    res.json({ message: 'All chats deleted successfully' });
  } catch (error) {
    console.error('Delete all chats error:', error);
    res.status(500).json({ error: 'Failed to delete all chats' });
  }
});

// Add new route for academic search
router.get('/academic-search', ensureAuthenticated, async (req, res) => {
  const { query, startYear, endYear } = req.query;
  
  try {
    const results = await searchService.academicSearch(query, {
      num: 10,
      startYear: parseInt(startYear) || 2015,
      endYear: parseInt(endYear) || new Date().getFullYear()
    });

    res.json(results);
  } catch (error) {
    console.error('Academic search error:', error);
    res.status(500).json({ error: 'Failed to perform academic search' });
  }
});

// Add new route for downloading papers
router.post('/download-paper', ensureAuthenticated, async (req, res) => {
  const { title, url } = req.body;
  
  try {
    const filePath = await downloadService.downloadPaper({ title, url });
    
    if (filePath) {
      res.download(filePath, `${title}.pdf`, (err) => {
        // Delete the file after download completes
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) console.error('Error deleting file:', unlinkErr);
        });
        
        if (err) {
          console.error('Download error:', err);
        }
      });
    } else {
      res.status(404).json({ error: 'Could not download paper' });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download paper' });
  }
});

module.exports = router;