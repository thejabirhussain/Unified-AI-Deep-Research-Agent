require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Add this line

// Add these route imports
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');
const subscriptionRoutes = require('./routes/subscription');

const app = express();

// Add this before mongoose.connect
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tls: true,
  tlsAllowInvalidCertificates: false,
  tlsAllowInvalidHostnames: false
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

// Enhanced Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions',
        ttl: 24 * 60 * 60 // Session TTL (1 day)
    }),
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Add this after your other middleware
app.use('/api', async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Allow free access to Gemini model
  if (req.body.model === 'gemini') {
    return next();
  }

  // Check subscription for other models
  const user = await User.findById(req.user._id).select('subscription credits');
  if (!user.subscription?.status === 'active' && !user.credits?.available) {
    return res.status(403).json({ 
      error: 'Subscription required',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  next();
});

// Add this before your route definitions
app.use((err, req, res, next) => {
  if (err.type === 'StripeError') {
    return res.status(400).json({
      error: err.message,
      code: err.code
    });
  }
  next(err);
});

// Models
const User = require('./models/user');
const Chat = require('./models/chat');

// Passport Local Strategy (Traditional Login)
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: 'Incorrect email.' });
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: 'Incorrect password.' });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Passport Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = new User({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName
      });
      await user.save();
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Routes
app.use('/chat', chatRoutes);
app.use('/auth', authRoutes);
app.use('/subscription', subscriptionRoutes);

// Stripe webhook route - Must be before express.json middleware
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
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

  // Handle the event
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      // Handle subscription changes
      await handleSubscriptionChange(subscription);
      break;
    case 'invoice.payment_succeeded':
      const invoice = event.data.object;
      // Handle successful payment
      await handleSuccessfulPayment(invoice);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Add these helper functions
async function handleSubscriptionChange(subscription) {
  try {
    await User.findOneAndUpdate(
      { 'subscription.stripeId': subscription.id },
      {
        'subscription.status': subscription.status,
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
      }
    );
  } catch (error) {
    console.error('Error updating subscription:', error);
  }
}

async function handleSuccessfulPayment(invoice) {
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
    const userId = subscription.metadata.userId;
    
    // Update user's credits based on their plan
    const creditAmount = subscription.metadata.planCredits || 100;
    await User.findByIdAndUpdate(userId, {
      $inc: { 'credits.available': creditAmount }
    });
  } catch (error) {
    console.error('Error handling payment:', error);
  }
}

// Root route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/chat');  // If user is logged in, go to chat
  } else {
    res.render('index');    // If not logged in, show index.ejs
  }
});

// Login route
app.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/chat');  // If already logged in, go to chat
  } else {
    res.render('login', { error: req.query.error || null });  // Show login.ejs
  }
});

// Local authentication
passport.authenticate('local', {
  successRedirect: '/chat',    // Successful login redirects to chat
  failureRedirect: '/login',   // Failed login goes back to login page
  failureFlash: true
});

// Chat route - Protected route
app.get('/chat', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');  // Unauthorized users go to login
  }
  res.render('chatscreen', {   // Authorized users see chat screen
    user: req.user,
    chats: []
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));