"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldCheck } from "lucide-react";

export default function FaqSection() {
    return (
        <section className="max-w-7xl mx-auto py-32 px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24 items-center">
                {/* Left Column: Visual Element (Swapped for Zig-Zag) */}
                <div className="relative h-full min-h-[400px] flex items-center justify-center order-2 md:order-1">
                    <div className="relative w-full max-w-sm aspect-square flex items-center justify-center p-8 rounded-2xl border border-cyan-500/20 bg-cyan-950/5 backdrop-blur-sm shadow-[0_0_30px_-5px_rgba(6,182,212,0.15)] group">
                        {/* Inner Glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-2xl" />

                        {/* Center Icon */}
                        <div className="relative z-10 p-6 rounded-full border border-cyan-500/30 bg-black/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-500">
                            <ShieldCheck className="w-16 h-16 text-cyan-400 animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        </div>

                        {/* Decorative Elements */}
                        <div className="absolute top-4 left-4 w-2 h-2 bg-cyan-500/40 rounded-full" />
                        <div className="absolute top-4 right-4 w-2 h-2 bg-cyan-500/40 rounded-full" />
                        <div className="absolute bottom-4 left-4 w-2 h-2 bg-cyan-500/40 rounded-full" />
                        <div className="absolute bottom-4 right-4 w-2 h-2 bg-cyan-500/40 rounded-full" />

                        <div className="absolute -bottom-12 text-xs font-mono text-cyan-500/60 tracking-widest">
                            SYSTEM_SECURITY_LEVEL: MAX
                        </div>
                    </div>
                </div>

                {/* Right Column: Questions (Swapped for Zig-Zag) */}
                <div className="order-1 md:order-2">
                    <h2 className="text-xl font-mono mb-8 text-neutral-200 text-left">
                        PROTOCOL PARAMETERS
                    </h2>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1" className="border-white/10">
                            <AccordionTrigger className="font-mono text-left font-normal text-neutral-200 hover:text-white hover:no-underline transition-colors">
                                Q1: Why choose a custom Next.js system over WordPress?
                            </AccordionTrigger>
                            <AccordionContent className="text-neutral-400 font-sans leading-relaxed">
                                WordPress is for blogs. Next.js is for high-performance web
                                applications. Better SEO, unhackable static generation, and
                                millisecond load times.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-2" className="border-white/10">
                            <AccordionTrigger className="font-mono text-left font-normal text-neutral-200 hover:text-white hover:no-underline transition-colors">
                                Q2: What is the ROI timeline?
                            </AccordionTrigger>
                            <AccordionContent className="text-neutral-400 font-sans leading-relaxed">
                                Most automation systems pay for themselves within 3-4 months
                                through saved man-hours.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-3" className="border-white/10">
                            <AccordionTrigger className="font-mono text-left font-normal text-neutral-200 hover:text-white hover:no-underline transition-colors">
                                Q3: Do you handle security?
                            </AccordionTrigger>
                            <AccordionContent className="text-neutral-400 font-sans leading-relaxed">
                                Yes. Aviation-grade security practices are standard. Data
                                encryption and secure API gateways.
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="item-4" className="border-white/10">
                            <AccordionTrigger className="font-mono text-left font-normal text-neutral-200 hover:text-white hover:no-underline transition-colors">
                                Q4: What happens after deployment?
                            </AccordionTrigger>
                            <AccordionContent className="text-neutral-400 font-sans leading-relaxed">
                                We offer a Maintenance Retainer to ensure systems remain
                                operational 24/7.
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </section>
    );
}
