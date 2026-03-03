import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const PACKAGES = {
    '5_credits': {
        name: '5 Skanów Diagnozy AI',
        price: 2900, // 29.00 PLN
        credits: 5,
    },
    '15_credits': {
        name: '15 Skanów (Wersja Warsztat)',
        price: 6900, // 69.00 PLN
        credits: 15,
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const packageId = body.packageId as keyof typeof PACKAGES;

        if (!packageId || !PACKAGES[packageId]) {
            return new NextResponse("Invalid package", { status: 400 });
        }

        const pkg = PACKAGES[packageId];

        // Ensure user exists in our DB to track customer ID
        let userDB = await db.user.findUnique({ where: { userId } });
        if (!userDB) {
            userDB = await db.user.create({ data: { userId } });
        }

        const session = await stripe.checkout.sessions.create({
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}?canceled=true`,
            payment_method_types: ['card', 'blik'], // Popular in Poland
            mode: 'payment',
            billing_address_collection: 'auto',
            customer_email: undefined, // Optional: pull from Clerk if needed
            client_reference_id: userId,
            line_items: [
                {
                    price_data: {
                        currency: 'pln',
                        product_data: {
                            name: pkg.name,
                            description: `Otrzymujesz ${pkg.credits} kredytów do wykorzystania na analizy audio/wideo.`,
                        },
                        unit_amount: pkg.price,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                userId,
                creditsToAdd: pkg.credits.toString()
            }
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("[STRIPE_CHECKOUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
