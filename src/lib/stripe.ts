import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const getStripe = () => {
  if (!stripePublishableKey) {
    console.error('VITE_STRIPE_PUBLISHABLE_KEY is not set');
    return null;
  }
  return loadStripe(stripePublishableKey);
};
