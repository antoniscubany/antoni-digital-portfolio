import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = req.headers.get('Stripe-Signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (error: any) {
        return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    if (event.type === 'checkout.session.completed') {
        const userId = session?.metadata?.userId;
        const creditsToAdd = Number(session?.metadata?.creditsToAdd);

        if (userId && creditsToAdd) {
            // Upsert the user to ensure they exist before adding credits
            await db.user.upsert({
                where: { id: userId },
                update: {
                    credits: {
                        increment: creditsToAdd
                    }
                },
                create: {
                    id: userId,
                    credits: creditsToAdd
                }
            });
        }
    }

    return new NextResponse(null, { status: 200 });
}
