import Stripe from 'stripe';

// Provide a fallback for build-time static generation to prevent crashes
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_fallback_for_build', {
    apiVersion: '2026-02-25.clover',
    appInfo: {
        name: 'Sonic Diagnostic',
        version: '0.1.0',
    },
});
