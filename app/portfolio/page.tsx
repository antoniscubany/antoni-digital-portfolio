"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Truck, BrainCircuit, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
    return (
        <div className="flex flex-col min-h-screen bg-black">
            <div className="vignette fixed inset-0 pointer-events-none z-10" />
            <Navbar />

            <main className="flex-grow pt-32 pb-24 px-6 relative z-0">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-16 border-b border-white/10 pb-6 flex items-end justify-between">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-mono text-white tracking-tighter mb-2">
                                DEPLOYED SYSTEMS
                            </h1>
                            <p className="text-neutral-500 font-mono text-sm tracking-widest uppercase">
                // ARCHIVE_STATUS: ACTIVE
                            </p>
                        </div>
                        <div className="hidden md:block">
                            <p className="text-neutral-600 font-mono text-xs">
                                SYS_ID: 001-002
                            </p>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Card 1: LOGISTICS_OS */}
                        <PortfolioCard
                            title="LOGISTICS_OS"
                            tag="High-Performance"
                            icon={Truck}
                            href="/portfolio/logistics"
                            color="emerald"
                        />

                        {/* Card 2: INTEL_SYNTH */}
                        <PortfolioCard
                            title="INTEL_SYNTH"
                            tag="Automation"
                            icon={BrainCircuit}
                            href="/portfolio/synthesizer"
                            color="cyan"
                        />
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}

interface PortfolioCardProps {
    title: string;
    tag: string;
    icon: React.ElementType;
    href: string;
    color: "emerald" | "cyan";
}

function PortfolioCard({ title, tag, icon: Icon, href, color }: PortfolioCardProps) {
    const colorClasses = {
        emerald: "group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)]",
        cyan: "group-hover:border-cyan-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.2)]",
    };

    const textColors = {
        emerald: "group-hover:text-emerald-400",
        cyan: "group-hover:text-cyan-400"
    }

    const bgColors = {
        emerald: "bg-emerald-500/10",
        cyan: "bg-cyan-500/10"
    }

    return (
        <Link
            href={href}
            className={cn(
                "group relative block h-[400px] w-full bg-neutral-900/40 rounded-xl border border-white/10 overflow-hidden transition-all duration-500 backdrop-blur-sm",
                colorClasses[color]
            )}
        >
            {/* Grid Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

            <div className="relative h-full flex flex-col justify-between p-8 z-10">
                {/* Top: Header */}
                <div className="flex justify-between items-start">
                    <div className={cn("p-4 rounded-lg border border-white/5 transition-colors duration-500", bgColors[color])}>
                        <Icon className={cn("w-8 h-8 text-neutral-400 transition-colors duration-500", textColors[color])} />
                    </div>
                    <ArrowUpRight className="text-neutral-600 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Bottom: Info */}
                <div>
                    <div className="inline-block px-2 py-1 mb-4 border border-white/10 rounded text-[10px] font-mono text-neutral-400 uppercase tracking-widest bg-black/40">
                        {tag}
                    </div>
                    <h2 className={cn("text-3xl font-mono text-neutral-200 transition-colors duration-300", textColors[color])}>
                        {title}
                    </h2>
                    <div className="w-full h-px bg-white/10 mt-6 relative overflow-hidden">
                        <div className={cn("absolute inset-0 w-full h-full -translate-x-full group-hover:translate-x-0 transition-transform duration-700 ease-out",
                            color === 'emerald' ? "bg-emerald-500" : "bg-cyan-500"
                        )} />
                    </div>
                </div>
            </div>
        </Link>
    );
}
