"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Terminal,
    Send,
    ChevronLeft,
    Copy,
    FileText,
    Loader2,
    Zap,
    ShieldAlert,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

// Mock AI Summaries
const SUMMARIES = {
    "executive": `### EXECUTIVE BRIEF: PRINCIPLES BY RAY DALIO
**Status:** COMPLETED | **Confidentiality:** LEVEL 4

**CORE THESIS:**
Life and work can be approached as a series of repeatable machines. Success is achieved by developing and refining "principles" through radical truth and radical transparency.

**KEY ACTIONABLES:**
1. **Radical Transparency:** Eliminate ego-driven filter to accelerate truth-seeking.
2. **Believability-Weighted Decision Making:** Not all opinions are equal; prioritize those with a proven track record.
3. **Pain + Reflection = Progress:** Treat every mistake as a diagnostic opportunity for the underlying system.
`,
    "strategic": `### STRATEGIC ROADMAP: PRINCIPLES BY RAY DALIO
**Focus:** SYSTEM OPTIMIZATION | **Cycle:** LONG-TERM

**PHASE 1: THE 5-STEP PROCESS**
1. Have clear goals.
2. Identify and don't tolerate problems.
3. Diagnose problems to get at their root causes.
4. Design plans to get around them.
5. Push through to completion.

**PHASE 2: CULTURE BUILDING**
- Implement an 'Idea Meritocracy'.
- Hire for character and thinking, train for skills.
- Use 'Dots' or similar tracking systems to quantify believability.
`,
    "technical": `### TECHNICAL DRILL-DOWN: PRINCIPLES BY RAY DALIO
**Subsystem:** LOGIC ENGINE | **Metric:** TRUTH ACCURACY

**ALGORITHMIC ARCHITECTURE:**
- **System Design:** Viewing one's life as a "Machine" where (Input) -> (Design/People) -> (Output).
- **Error Diagnostics:** Root Cause Analysis (RCA) is mandatory for every variance in expected vs. actual output.
- **Decision Matrix:** Believability = (Total Success Count) / (Attempt count) + (Subject Matter Expertise).
- **Feedback Loops:** Real-time data collection via "Pain Buttons" and "Baseball Cards".
`
};

const LOG_MESSAGES = [
    "[SYSTEM] INITIALIZING_LLM_CORE...",
    "[CORE] ESTABLISHING_SECURE_TUNNEL...",
    "[DATA] EXTRACTING_KEY_ENTITIES_V2.1...",
    "[LOGIC] MAPPING_STRATEGIC_DEPENDENCIES...",
    "[AI] SYNTHESIZING_BRIEF_PROTOCOLS...",
    "[RENDER] FINALIZING_AERO_INTERFACE..."
];

export default function SynthesizerPage() {
    const [inputText, setInputText] = useState("");
    const [mode, setMode] = useState<"executive" | "strategic" | "technical">("executive");
    const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "COMPLETED">("IDLE");
    const [logs, setLogs] = useState<string[]>([]);
    const [progress, setProgress] = useState(0);
    const [displayText, setDisplayText] = useState("");
    const outputRef = useRef<HTMLDivElement>(null);

    const handleSynthesize = async () => {
        if (!inputText) return;

        setStatus("PROCESSING");
        setLogs([]);
        setProgress(0);
        setDisplayText("");

        // Simulate logs and progress
        for (let i = 0; i < LOG_MESSAGES.length; i++) {
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
            setLogs(prev => [...prev, LOG_MESSAGES[i]]);
            setProgress(((i + 1) / LOG_MESSAGES.length) * 100);
        }

        await new Promise(r => setTimeout(r, 500));
        setStatus("COMPLETED");
    };

    // Typewriter effect
    useEffect(() => {
        if (status === "COMPLETED") {
            const fullText = SUMMARIES[mode];
            let i = 0;
            const interval = setInterval(() => {
                setDisplayText(fullText.slice(0, i));
                i += 3; // Type 3 chars at a time for speed
                if (i > fullText.length) {
                    clearInterval(interval);
                    setDisplayText(fullText);
                }
            }, 10);
            return () => clearInterval(interval);
        }
    }, [status, mode]);

    return (
        <div className="min-h-screen bg-[#010101] text-[#E0E0E0] font-mono selection:bg-[#00F0FF] selection:text-black p-4 md:p-10">
            {/* Aviation Grid Overlay */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* Header */}
            <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-2 text-[#00F0FF] mb-1">
                        <Zap size={18} fill="currentColor" />
                        <span className="text-xs font-bold tracking-[0.3em] uppercase">Intelligence Synthesizer</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tighter">ENGINE.V1_LAB</h1>
                </div>

                <Link
                    href="/"
                    className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 border border-white/10 hover:bg-white/5 transition-colors group"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-bold tracking-widest uppercase">Return to Command Center</span>
                </Link>
            </header>

            <main className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">

                {/* Left Control Panel */}
                <div className="lg:col-span-5 space-y-10">

                    {/* Input Section */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-white/40">
                            <Terminal size={14} />
                            <span className="text-[10px] tracking-[0.2em] uppercase font-bold">Primary Input Container</span>
                        </div>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="PASTE SOURCE TEXT OR DOCUMENT TITLE HERE..."
                            className="w-full h-48 bg-black border border-white/10 rounded-sm p-4 text-sm focus:outline-none focus:border-[#00F0FF]/50 transition-colors resize-none placeholder:text-white/10"
                        />
                    </section>

                    {/* Mode Selection */}
                    <section>
                        <div className="flex items-center gap-2 mb-4 text-white/40">
                            <ShieldAlert size={14} />
                            <span className="text-[10px] tracking-[0.2em] uppercase font-bold">Protocol Selection</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {(['executive', 'strategic', 'technical'] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setMode(m)}
                                    disabled={status === "PROCESSING"}
                                    className={`flex items-center justify-between px-4 py-3 border text-left transition-all group ${mode === m
                                            ? 'border-[#00F0FF] bg-[#00F0FF]/5 text-[#00F0FF]'
                                            : 'border-white/10 hover:border-white/30 text-white/40 hover:text-white'
                                        }`}
                                >
                                    <span className="text-xs font-bold tracking-[0.2em] uppercase">{m.replace('-', ' ')}</span>
                                    {mode === m && <div className="h-1 w-1 bg-[#00F0FF] rounded-full animate-pulse" />}
                                    {mode !== m && <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Action */}
                    <button
                        onClick={handleSynthesize}
                        disabled={status === "PROCESSING" || !inputText}
                        className="w-full py-4 bg-[#E0E0E0] text-black font-black text-xs tracking-[0.4em] uppercase hover:bg-[#00F0FF] transition-colors flex items-center justify-center gap-4 disabled:opacity-20 disabled:cursor-not-allowed group"
                    >
                        {status === "PROCESSING" ? (
                            <>INITIALIZING... <Loader2 size={16} className="animate-spin" /></>
                        ) : (
                            <>SYNTHESIZE <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /></>
                        )}
                    </button>
                </div>

                {/* Right Output Panel */}
                <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-white/40">
                            <FileText size={14} />
                            <span className="text-[10px] tracking-[0.2em] uppercase font-bold">Synthesized Intelligence Output</span>
                        </div>
                        {status === "COMPLETED" && (
                            <div className="flex gap-2">
                                <button className="p-2 border border-white/10 hover:bg-white/5 transition-colors text-white/40 hover:text-[#00F0FF]">
                                    <Copy size={14} />
                                </button>
                                <button className="p-2 border border-white/10 hover:bg-white/5 transition-colors text-white/40 hover:text-[#00F0FF]">
                                    <FileText size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow bg-white/[0.02] border border-white/10 relative overflow-hidden flex flex-col">

                        {/* Processing Overlay */}
                        <AnimatePresence>
                            {status === "PROCESSING" && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-20 bg-black flex flex-col p-8 justify-end"
                                >
                                    <div className="space-y-2 mb-8 font-mono text-[10px] text-[#00F0FF]/70">
                                        {logs.map((log, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                            >
                                                {log}
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div className="relative h-[1px] w-full bg-white/10">
                                        <motion.div
                                            className="absolute inset-y-0 left-0 bg-[#00F0FF]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Content Display */}
                        <div
                            ref={outputRef}
                            className="flex-grow p-8 overflow-y-auto prose prose-invert prose-xs max-w-none scrollbar-hide pb-20"
                        >
                            {status === "IDLE" && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                                    <Loader2 size={40} className="animate-[spin_4s_linear_infinite]" />
                                    <p className="text-[10px] tracking-[0.3em] font-bold uppercase">Awaiting Command Instruction</p>
                                </div>
                            )}

                            {status === "COMPLETED" && (
                                <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90 font-sans">
                                    {displayText}
                                    {displayText.length < SUMMARIES[mode].length && (
                                        <span className="inline-block w-2 h-4 bg-[#00F0FF] ml-1 animate-pulse" />
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Aero Status */}
                        <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-[8px] tracking-[0.3em] font-bold uppercase text-white/20 border-t border-white/5 pt-4">
                            <div className="flex gap-4">
                                <span>MT: 14.2 MS</span>
                                <span>CPU: 22%</span>
                            </div>
                            <span>NODE: ANALYTICS_01</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Decorative Scanlines */}
            <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
        </div>
    );
}
