"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
    { name: "Services", href: "#services" },
    { name: "Portfolio", href: "#portfolio" },
    { name: "Lab", href: "#lab" },
    { name: "Contact", href: "/contact" },
];

export default function FloatingNav() {
    const [isExpanded, setIsExpanded] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsExpanded(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
        }, 150);
    };

    return (
        <motion.nav
            className="fixed top-6 left-1/2 z-50"
            initial={{ x: "-50%", y: -100 }}
            animate={{ x: "-50%", y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
            <motion.div
                className="relative flex items-center justify-center overflow-hidden"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                layout
                style={{
                    background: "rgba(10, 10, 10, 0.7)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "9999px",
                }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <motion.div
                    className="flex items-center gap-2 px-6 py-3"
                    layout
                >
                    {/* Logo */}
                    <motion.a
                        href="/"
                        className="font-mono text-sm font-bold tracking-wider text-white whitespace-nowrap"
                        layout
                    >
                        ANTO-LAB
                    </motion.a>

                    {/* Divider */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "1px" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="h-4 bg-white/20 mx-2"
                            />
                        )}
                    </AnimatePresence>

                    {/* Navigation Links */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div
                                className="flex items-center gap-1"
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                            >
                                {navLinks.map((link, index) => (
                                    <motion.a
                                        key={link.name}
                                        href={link.href}
                                        className="px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors duration-200 hover:text-white rounded-full hover:bg-white/10 whitespace-nowrap"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{
                                            duration: 0.2,
                                            delay: index * 0.05,
                                            ease: "easeOut",
                                        }}
                                    >
                                        {link.name}
                                    </motion.a>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Glow effect */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-500"
                    style={{
                        background:
                            "radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%)",
                    }}
                />
            </motion.div>
        </motion.nav>
    );
}
