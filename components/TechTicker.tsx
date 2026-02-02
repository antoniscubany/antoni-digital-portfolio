"use client";

import { motion } from "framer-motion";
import { useState } from "react";

const techStack = [
    { name: "React", description: "UI Library" },
    { name: "Next.js", description: "Production Framework" },
    { name: "TypeScript", description: "Type Safety" },
    { name: "OpenAI", description: "AI Integration" },
    { name: "Tailwind", description: "Utility CSS" },
    { name: "Node.js", description: "Runtime" },
    { name: "Framer", description: "Motion & Animation" },
    { name: "Vercel", description: "Deployment" },
    { name: "Docker", description: "Containerization" },
    { name: "Python", description: "Data & AI" },
];

export default function TechTicker() {
    // Triple the items for smoother infinite scroll on wide screens
    const items = [...techStack, ...techStack, ...techStack];
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    return (
        <div className="relative w-full overflow-hidden border-t border-white/5 bg-black/20 backdrop-blur-sm py-4">
            {/* Scroll Track */}
            <motion.div
                className="flex items-center gap-16 w-max"
                animate={{ x: ["0%", "-33.33%"] }}
                transition={{
                    x: {
                        duration: 40,
                        repeat: Infinity,
                        ease: "linear",
                    },
                }}
                style={{
                    // Pause animation on hover
                    animationPlayState: hoveredIndex !== null ? "paused" : "running",
                }}
            >
                {items.map((tech, index) => (
                    <div
                        key={`${tech.name}-${index}`}
                        className="group relative flex items-center gap-3 cursor-default"
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        {/* Tech Name */}
                        <span className="font-mono-data text-sm font-medium uppercase tracking-wider text-[var(--slate-grey)] group-hover:text-[var(--electric-cyan)] transition-colors duration-300">
                            {tech.name}
                        </span>

                        {/* Separator */}
                        <span className="text-[var(--slate-grey)]/20 text-xs">{"//"}</span>

                        {/* Tooltip */}
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-3 py-1.5 bg-[var(--void-black)] border border-[var(--electric-cyan)]/30 text-[var(--electric-cyan)] text-xs font-mono rounded shadow-[0_0_15px_rgba(0,240,255,0.2)] opacity-0 transform translate-y-2 transition-all duration-300 pointer-events-none whitespace-nowrap z-20 ${hoveredIndex === index ? "opacity-100 translate-y-0" : ""}`}>
                            {tech.description}
                        </div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
}
