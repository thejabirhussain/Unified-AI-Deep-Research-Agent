const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleId: { type: String, sparse: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    name: { type: String, required: true },
    avatar: { type: String },
    tier: { 
        type: String, 
        enum: ['free', 'pro'], 
        default: 'free' 
    },
    subscription: {
        plan: { 
            type: String, 
            enum: ['monthly', 'annual'], 
            default: 'monthly' 
        },
        status: { 
            type: String, 
            enum: ['active', 'past_due', 'canceled'], 
            default: 'active' 
        },
        stripeId: String,
        currentPeriodEnd: Date,
        cancelAtPeriodEnd: { type: Boolean, default: false },
        paymentMethod: { type: String }
    },
    usage: {
        requests: { type: Number, default: 0 },
        tokens: { type: Number, default: 0 },
        lastUsed: { type: Date },
        firstUsed: { type: Date }
    },
    limits: {
        monthlyRequests: { type: Number, default: 100 }, // Free tier limit
        maxPdfSize: { type: Number, default: 10 } // MB
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Update timestamp before save
userSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Method to check if user can make a request
userSchema.methods.canMakeRequest = function() {
    if (this.tier === 'pro') return true;
    
    const now = new Date();
    const firstUsedThisMonth = new Date(
        now.getFullYear(), 
        now.getMonth(), 
        1
    );
    
    return (
        (!this.usage.firstUsed || this.usage.firstUsed < firstUsedThisMonth) ||
        this.usage.requests < this.limits.monthlyRequests
    );
};

// Add helper method to check subscription status
userSchema.methods.hasActiveSubscription = function() {
    return (
        this.subscription.status === 'active' &&
        (!this.subscription.currentPeriodEnd || 
         this.subscription.currentPeriodEnd > new Date())
    );
};

// Add method to check if subscription needs renewal
userSchema.methods.needsRenewal = function() {
    if (!this.subscription.currentPeriodEnd) return false;
    
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    return (
        this.subscription.status === 'active' &&
        this.subscription.currentPeriodEnd < threeDaysFromNow
    );
};

module.exports = mongoose.model('User', userSchema);