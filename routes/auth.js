const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

// Traditional Login
router.post('/login', passport.authenticate('local', {
  successRedirect: '/chat',
  failureRedirect: '/login',
  failureFlash: true
}));

// Traditional Signup
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.redirect('/login?error=Email already exists');
    user = new User({
      name,
      email,
      password: await bcrypt.hash(password, 10)
    });
    await user.save();
    req.login(user, (err) => {
      if (err) return res.redirect('/login?error=Login failed');
      res.redirect('/chat');
    });
  } catch (err) {
    res.redirect('/login?error=Signup failed');
  }
});

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', {
  successRedirect: '/chat',
  failureRedirect: '/login'
}));

// Logout
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.redirect('/');
    res.redirect('/');
  });
});

module.exports = router;