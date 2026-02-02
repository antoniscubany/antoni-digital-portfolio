"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
    Code2,
    Atom,
    Zap,
    Terminal,
    Cpu,
    Wind,
    Server,
    Layers,
    Database,
    Globe,
    LucideIcon
} from "lucide-react";

interface TechItem {
    name: string;
    icon: LucideIcon;
    color: string;
    description: string;
}

const techStack: TechItem[] = [
    { name: "Python", icon: Code2, color: "#3776AB", description: "Backend Logic" },
    { name: "React", icon: Atom, color: "#61DAFB", description: "UI Library" },
    { name: "Next.js", icon: Zap, color: "#ffffff", description: "Full Stack" },
    { name: "TypeScript", icon: Terminal, color: "#3178C6", description: "Type Safety" },
    { name: "OpenAI", icon: Cpu, color: "#10A37F", description: "Intelligence" },
    { name: "Tailwind", icon: Wind, color: "#38B2AC", description: "Styling" },
    { name: "Node.js", icon: Server, color: "#339933", description: "Runtime" },
    { name: "Framer", icon: Layers, color: "#0055FF", description: "Animation" },
    { name: "Postgres", icon: Database, color: "#336791", description: "Data Store" },
    { name: "Vercel", icon: Globe, color: "#000000", description: "Deployment" },
];

export default function TechStackTicker() {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Quadruple items for easier 25% animation steps (smoother than 33.33%)
    const items = [...techStack, ...techStack, ...techStack, ...techStack];

    return (
        <div className="relative w-full border-t border-white/5 bg-black/40 backdrop-blur-md">

            {/* Gradient Mask for fading edges (Pro Depth) */}
            <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-[var(--void-black)] via-transparent to-[var(--void-black)] opacity-80" />

            {/* Container with extra top padding for Tooltips */}
            <div className="relative w-full overflow-hidden pt-20 pb-8 flex items-center">
                <motion.div
                    className="flex items-center gap-16 w-max pl-8"
                    animate={{ x: ["0%", "-25%"] }} // Perfect quarter slide for 4 sets
                    transition={{
                        x: {
                            duration: 30, // Faster
                            repeat: Infinity,
                            ease: "linear",
                        },
                    }}
                    style={{
                        animationPlayState: hoveredIndex !== null ? "paused" : "running",
                    }}
                >
                    {items.map((tech, index) => {
                        const isHovered = hoveredIndex === index;
                        const Icon = tech.icon;

                        return (
                            <div
                                key={`${tech.name}-${index}`}
                                className="group relative flex items-center gap-4 cursor-default transition-all duration-500 ease-out"
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{
                                    transform: isHovered ? "scale(1.15) translateY(-5px)" : "scale(1) translateY(0)",
                                    filter: hoveredIndex !== null && !isHovered ? "blur(2px) opacity(0.5)" : "none", // Focus effect
                                }}
                            >
                                {/* Icon */}
                                <div
                                    className="transition-colors duration-300 relative"
                                    style={{
                                        color: isHovered ? tech.color : "#64748b" // slate-500
                                    }}
                                >
                                    <Icon size={28} />
                                    {/* Subtle Glow behind active icon */}
                                    {isHovered && (
                                        <div
                                            className="absolute inset-0 blur-md opacity-50"
                                            style={{ backgroundColor: tech.color }}
                                        />
                                    )}
                                </div>

                                {/* Text Content */}
                                <div className="flex flex-col">
                                    <span
                                        className="font-mono-data text-sm font-bold uppercase tracking-wider transition-colors duration-300"
                                        style={{
                                            color: isHovered ? tech.color : "#64748b"
                                        }}
                                    >
                                        {tech.name}
                                    </span>

                                    {/* Tooltip Bubble */}
                                    <div
                                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 px-4 py-2 bg-[var(--void-black)] border border-[var(--electric-cyan)]/30 text-[var(--electric-cyan)] text-[10px] font-mono rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.2)] whitespace-nowrap z-50 pointer-events-none transition-all duration-300 ease-out"
                                        style={{
                                            opacity: isHovered ? 1 : 0,
                                            transform: isHovered ? "translate(-50%, 0) scale(1)" : "translate(-50%, 15px) scale(0.9)",
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--electric-cyan)] animate-pulse" />
                                            {tech.description}
                                        </div>
                                        {/* Arrow */}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--electric-cyan)]/30" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Top Shine Line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
    );
}
