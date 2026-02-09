"use client";

import { cn } from "@/lib/utils";

interface TestimonialCardProps {
    role: string;
    quote: string;
    className?: string;
}

function TestimonialCard({ role, quote, className }: TestimonialCardProps) {
    return (
        <div
            className={cn(
                "relative p-8 rounded-xl border border-white/10 bg-black/40 backdrop-blur-sm transition-all hover:border-white/20 group",
                className
            )}
        >
            <div className="absolute top-0 right-0 p-3 pt-4 pr-4">
                <span className="text-[10px] sm:text-xs font-mono text-emerald-500/80 group-hover:text-emerald-400 transition-colors tracking-wider">
                    [VERIFIED_CLIENT]
                </span>
            </div>
            <div className="flex flex-col h-full justify-between gap-6">
                <p className="text-neutral-300 font-sans leading-relaxed text-sm sm:text-base">
                    "{quote}"
                </p>
                <div>
                    <div className="h-px w-12 bg-white/10 mb-3 group-hover:w-20 transition-all duration-500" />
                    <p className="text-white/60 font-mono text-sm tracking-wide uppercase">
                        {role}
                    </p>
                </div>
            </div>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/20 rounded-tl-lg" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/20 rounded-br-lg" />
        </div>
    );
}

export default function Testimonials() {
    const testimonials = [
        {
            role: "Logistics CEO",
            quote:
                "The automation system reduced our dispatch time by 40%. Antoni operates with surgical precision.",
        },
        {
            role: "SaaS Founder",
            quote:
                "We needed a scalable frontend. The architecture is bulletproof.",
        },
        {
            role: "E-commerce Director",
            quote:
                "Finally, a developer who understands business logic, not just code.",
        },
    ];

    return (
        <section className="py-24 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {testimonials.map((t, i) => (
                        <TestimonialCard key={i} role={t.role} quote={t.quote} />
                    ))}
                </div>
            </div>
        </section>
    );
}
