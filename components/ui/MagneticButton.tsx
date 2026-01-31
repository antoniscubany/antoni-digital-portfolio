"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export default function MagneticButton({
    children,
    className = "",
    onClick,
}: MagneticButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const distanceX = e.clientX - centerX;
        const distanceY = e.clientY - centerY;

        // Magnetic pull strength
        const strength = 0.3;

        setPosition({
            x: distanceX * strength,
            y: distanceY * strength,
        });
    };

    const handleMouseLeave = () => {
        setPosition({ x: 0, y: 0 });
    };

    return (
        <motion.button
            ref={buttonRef}
            className={`relative group overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onClick}
            animate={{ x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            style={{
                background: "linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)",
                padding: "16px 32px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                color: "#030303",
                fontFamily: "var(--font-geist-mono), monospace",
            }}
        >
            {/* Shimmer effect */}
            <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100"
                style={{
                    background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    transform: "translateX(-100%)",
                }}
                animate={{
                    transform: ["translateX(-100%)", "translateX(100%)"],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                }}
            />

            {/* Button text */}
            <span className="relative z-10 flex items-center gap-2">
                {children}
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform duration-300 group-hover:translate-x-1"
                >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                </svg>
            </span>

            {/* Glow effect */}
            <div
                className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    boxShadow: "0 0 40px rgba(255, 255, 255, 0.3)",
                }}
            />
        </motion.button>
    );
}
