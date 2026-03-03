'use server';

import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';

export async function createCheckoutSession() {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'blik', 'p24'],
        mode: 'payment',
        line_items: [
            {
                price: process.env.STRIPE_CREDIT_PRICE_ID || 'price_default_fallback',
                quantity: 1,
            },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?canceled=true`,
        client_reference_id: userId,
    });

    return { url: session.url };
}
