const stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY);

async function handleSubscription(planId) {
  try {
    // Create payment method
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement('card'),
      billing_details: {
        email: userEmail
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    // Create subscription
    const response = await fetch('/subscription/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentMethodId: paymentMethod.id,
        plan: planId
      })
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // Handle successful subscription
    window.location.href = '/dashboard';
  } catch (error) {
    console.error(error);
    alert('Payment failed: ' + error.message);
  }
}