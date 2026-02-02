"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useRef } from "react";
import TechStackTicker from "./ui/TechStackTicker";
import dynamic from "next/dynamic";

// Dynamic import for IconCloudSphere
const IconCloudSphere = dynamic(() => import("./ui/IconCloudSphere"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-[var(--electric-cyan)]/30 animate-pulse" />
        </div>
    ),
});

export default function Hero() {
    return (
        <section className="relative min-h-screen flex flex-col pt-24 pb-0 overflow-hidden items-center justify-center">
            {/* Ambient Background Depth */}
            <div className="depth-glow-cyan bottom-[-10%] right-[-10%]" />
            <div className="depth-glow-slate top-[-10%] left-[-10%]" />

            {/* Main Content Grid */}
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center flex-1">

                {/* Text Content - Left on Desktop */}
                <div className="order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left z-20 pb-12 lg:pb-0">
                    {/* Pre-headline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="font-mono-data text-xs md:text-sm uppercase tracking-[0.3em] text-[var(--electric-cyan)] mb-6"
                    >
                        Digital Systems Engineer
                    </motion.p>

                    {/* Main Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.1] mb-8"
                    >
                        <span className="text-white">ARCHITECTING</span>
                        <br />
                        <span className="gradient-text-cyan">DIGITAL VELOCITY</span>
                    </motion.h1>

                    {/* Sub-headline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.8 }}
                        className="font-mono-data text-sm md:text-base text-gray-300 max-w-xl mb-10 leading-relaxed"
                    >
                        I build high-performance growth systems for businesses that demand precision.
                        <br />
                        <span className="text-cyan-400 mt-2 block">
                            Next.js {"// "}AI Integration {"// "}Automation
                        </span>
                    </motion.p>

                    {/* CTA Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.8 }}
                    >
                        <MagneticButton />
                    </motion.div>
                </div>

                {/* Icon Cloud - Right on Desktop */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, duration: 1 }}
                    className="order-1 lg:order-2 flex items-center justify-center relative w-full h-[400px] lg:h-[600px] z-10"
                >
                    <IconCloudSphere />

                    {/* Glow effect behind sphere */}
                    <div className="absolute inset-0 bg-[var(--electric-cyan)]/5 blur-[100px] -z-10 rounded-full" />
                </motion.div>
            </div>

            {/* Tech Stack Ticker - Bottom */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 1 }}
                className="w-full mt-auto"
            >
                <TechStackTicker />
            </motion.div>
        </section>
    );
}

function MagneticButton() {
    const ref = useRef<HTMLButtonElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springConfig = { stiffness: 150, damping: 15 };
    const xSpring = useSpring(x, springConfig);
    const ySpring = useSpring(y, springConfig);

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        x.set(deltaX * 0.3);
        y.set(deltaY * 0.3);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: xSpring, y: ySpring }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="relative group px-8 py-4 bg-transparent border border-[var(--electric-cyan)] text-[var(--electric-cyan)] font-mono-data text-sm tracking-widest uppercase overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:text-[var(--electric-cyan)]"
        >
            <span className="absolute inset-0 bg-[var(--electric-cyan)]/10 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left -z-10" />
            <span className="relative z-10 flex items-center gap-2">
                INITIALIZE PROJECT
            </span>
        </motion.button>
    );
}
