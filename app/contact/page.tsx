"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Instagram } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ContactPage() {
    const [formState, setFormState] = useState({
        name: "",
        email: "",
        projectType: "",
        message: "",
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate form submission
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setSubmitted(true);
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        setFormState({
            ...formState,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#030303] text-white selection:bg-[var(--electric-cyan)] selection:text-black">
            <div className="vignette fixed inset-0 pointer-events-none z-0" />
            <Navbar />

            <main className="flex-grow pt-32 pb-20 px-6 relative z-10">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                    {/* Left Column: Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="font-mono-data text-4xl md:text-6xl font-bold mb-6 tracking-tighter">
                            LET'S BUILD <br />
                            <span className="text-[var(--electric-cyan)]">EXTRAORDINARY</span>
                        </h1>
                        <p className="text-[var(--slate-grey)] text-lg mb-12 max-w-md leading-relaxed">
                            Ready to engineer your digital velocity? We are currently accepting
                            select new projects. Tell us about your vision.
                        </p>

                        <div className="space-y-8">
                            <div className="flex items-start gap-4 group">
                                <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:border-[var(--electric-cyan)]/50 transition-colors">
                                    <Mail className="w-6 h-6 text-[var(--electric-cyan)]" />
                                </div>
                                <div>
                                    <h3 className="font-mono text-sm text-[var(--slate-grey)] uppercase tracking-wider mb-1">
                                        Email
                                    </h3>
                                    <a
                                        href="mailto:anto.lab2@gmail.com"
                                        className="text-xl font-medium hover:text-[var(--electric-cyan)] transition-colors"
                                    >
                                        anto.lab2@gmail.com
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:border-[var(--electric-cyan)]/50 transition-colors">
                                    <Phone className="w-6 h-6 text-[var(--electric-cyan)]" />
                                </div>
                                <div>
                                    <h3 className="font-mono text-sm text-[var(--slate-grey)] uppercase tracking-wider mb-1">
                                        Phone
                                    </h3>
                                    <a
                                        href="tel:+48519518915"
                                        className="text-xl font-medium hover:text-[var(--electric-cyan)] transition-colors"
                                    >
                                        +48 519 518 915
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 group">
                                <div className="p-3 rounded-full bg-white/5 border border-white/10 group-hover:border-[var(--electric-cyan)]/50 transition-colors">
                                    <MapPin className="w-6 h-6 text-[var(--electric-cyan)]" />
                                </div>
                                <div>
                                    <h3 className="font-mono text-sm text-[var(--slate-grey)] uppercase tracking-wider mb-1">
                                        Socials
                                    </h3>
                                    <div className="flex gap-4 mt-1">
                                        <a
                                            href="https://instagram.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white hover:text-[var(--electric-cyan)] transition-colors"
                                        >
                                            <Instagram className="w-6 h-6" />
                                        </a>
                                        <a
                                            href="https://x.com"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-white hover:text-[var(--electric-cyan)] transition-colors"
                                        >
                                            {/* X Logo / Twitter */}
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="24"
                                                height="24"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="lucide lucide-twitter"
                                            >
                                                <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                                                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right Column: Lead Gen Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-sm"
                    >
                        {submitted ? (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--electric-cyan)]/20 text-[var(--electric-cyan)] mb-6">
                                    <Send className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Message Sent</h3>
                                <p className="text-[var(--slate-grey)]">
                                    We'll analyze your request and get back to you within 24 hours.
                                </p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="mt-8 text-sm font-mono text-[var(--electric-cyan)] hover:underline underline-offset-4"
                                >
                                    Send another message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="block font-mono text-xs uppercase tracking-wider text-[var(--slate-grey)] mb-2"
                                    >
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        required
                                        value={formState.name}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block font-mono text-xs uppercase tracking-wider text-[var(--slate-grey)] mb-2"
                                    >
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        required
                                        value={formState.email}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--electric-cyan)] transition-colors"
                                        placeholder="john@company.com"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="projectType"
                                        className="block font-mono text-xs uppercase tracking-wider text-[var(--slate-grey)] mb-2"
                                    >
                                        Project Type
                                    </label>
                                    <select
                                        id="projectType"
                                        name="projectType"
                                        value={formState.projectType}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--electric-cyan)] transition-colors appearance-none"
                                    >
                                        <option value="" disabled>
                                            Select an option
                                        </option>
                                        <option value="web-dev">Web Development</option>
                                        <option value="ai-integration">AI Integration</option>
                                        <option value="automation">Automation System</option>
                                        <option value="consulting">Consulting</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label
                                        htmlFor="message"
                                        className="block font-mono text-xs uppercase tracking-wider text-[var(--slate-grey)] mb-2"
                                    >
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={4}
                                        value={formState.message}
                                        onChange={handleChange}
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[var(--electric-cyan)] transition-colors resize-none"
                                        placeholder="Tell us about the project..."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-[var(--electric-cyan)] text-black font-bold py-4 rounded-lg hover:bg-[#00E5FF] transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        "Sending..."
                                    ) : (
                                        <>
                                            INITIALIZE CONTACT <Send className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </motion.div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
