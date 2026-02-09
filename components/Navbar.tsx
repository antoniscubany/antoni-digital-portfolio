"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
    { label: "Mission", href: "#mission" },
    { label: "Systems", href: "#systems" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Contact", href: "/contact" },
];

export default function Navbar() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);

    return (
        <>
            <motion.nav
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="fixed top-0 left-0 w-full z-50 bg-black/50 backdrop-blur-xl border-b border-white/10"
            >
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link
                        href="/"
                        className="flex items-center hover:opacity-80 transition-opacity duration-300"
                    >
                        {!logoError ? (
                            <Image
                                src="/logo4.png"
                                alt="ANTONI.LAB"
                                width={180}
                                height={56}
                                className="h-12 md:h-14 w-auto object-contain"
                                onError={() => setLogoError(true)}
                                priority
                            />
                        ) : (
                            <span className="font-mono-data text-sm font-bold tracking-wide text-white">
                                ANTONI<span className="text-[var(--electric-cyan)]">.</span>LAB
                            </span>
                        )}
                    </Link>

                    {/* Nav Links - Desktop */}
                    <ul className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <li key={link.label}>
                                <Link
                                    href={link.href}
                                    className="font-mono-data text-xs uppercase tracking-widest text-[var(--slate-grey)] hover:text-[var(--electric-cyan)] transition-colors duration-300 relative group"
                                >
                                    {link.label}
                                    <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[var(--electric-cyan)] transition-all duration-300 group-hover:w-full" />
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(true)}
                        className="md:hidden p-2 text-[var(--slate-grey)] hover:text-[var(--electric-cyan)] transition-colors cursor-pointer"
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </motion.nav>

            {/* Mobile Full-Screen Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[100] md:hidden"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[var(--void-black)]/95 backdrop-blur-xl"
                            onClick={() => setMobileMenuOpen(false)}
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: 0.1 }}
                            className="relative h-full flex flex-col items-center justify-center bg-black/50"
                        >
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="absolute top-6 right-6 p-2 text-[var(--slate-grey)] hover:text-[var(--electric-cyan)] transition-colors cursor-pointer"
                            >
                                <X size={24} />
                            </button>

                            <nav className="flex flex-col items-center gap-8">
                                {navLinks.map((link, index) => (
                                    <motion.div
                                        key={link.label}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1 + index * 0.1 }}
                                    >
                                        <Link
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="font-mono-data text-xl uppercase tracking-[0.2em] text-white hover:text-[var(--electric-cyan)] transition-colors duration-300"
                                        >
                                            {link.label}
                                        </Link>
                                    </motion.div>
                                ))}
                            </nav>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
