"use client";

import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import MagneticButton from "./MagneticButton";
import TechStackTicker from "./TechStackTicker";

// Dynamic import for 3D component to avoid SSR issues
const WireframeGlobe = dynamic(() => import("./WireframeGlobe"), {
    ssr: false,
    loading: () => (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 border border-blue-500/20 rounded-full animate-pulse" />
        </div>
    ),
});

export default function HeroSection() {
    return (
        <section
            className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
            style={{ background: "#030303" }}
        >
            {/* 3D Globe Background */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full max-w-4xl">
                    <WireframeGlobe />
                </div>
            </div>

            {/* Gradient overlays */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(circle at 50% 50%, transparent 0%, #030303 70%)",
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-8"
                >
                    <span
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wider"
                        style={{
                            background: "rgba(59, 130, 246, 0.1)",
                            border: "1px solid rgba(59, 130, 246, 0.2)",
                            color: "#3b82f6",
                        }}
                    >
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        SYSTEMS ONLINE
                    </span>
                </motion.div>

                {/* H1 Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-none mb-8"
                    style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
                >
                    <span className="block">ARCHITECTING</span>
                    <span
                        className="block mt-2"
                        style={{
                            background: "linear-gradient(135deg, #ffffff 0%, #3b82f6 50%, #8b5cf6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        DIGITAL VELOCITY
                    </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mb-12 leading-relaxed"
                    style={{ fontFamily: "var(--font-geist-mono), monospace" }}
                >
                    Precision-engineered AI systems for high-stakes business growth.
                    <br className="hidden sm:block" />
                    We don&apos;t just design; we build{" "}
                    <span className="text-white font-semibold">engines</span>.
                </motion.p>

                {/* CTA Button */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                >
                    <MagneticButton>INITIALIZE PROJECT</MagneticButton>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.5 }}
                    className="absolute bottom-32 left-1/2 transform -translate-x-1/2"
                >
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        className="flex flex-col items-center gap-2"
                    >
                        <span className="text-xs text-gray-500 tracking-widest">SCROLL</span>
                        <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-gray-500"
                        >
                            <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                    </motion.div>
                </motion.div>
            </div>

            {/* Tech Stack Ticker at Bottom */}
            <div className="absolute bottom-0 left-0 right-0">
                <TechStackTicker />
            </div>

            {/* Decorative elements */}
            <div className="absolute top-1/4 left-10 w-px h-32 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent" />
            <div className="absolute top-1/3 right-10 w-px h-24 bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
            <div className="absolute bottom-1/3 left-20 w-2 h-2 rounded-full bg-blue-500/30" />
            <div className="absolute top-1/2 right-20 w-2 h-2 rounded-full bg-purple-500/30" />
        </section>
    );
}
