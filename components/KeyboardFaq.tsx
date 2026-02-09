"use client";

import { motion } from "framer-motion";
import { Clock, Wallet, Shield, Cpu, Zap, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KeycapProps {
    icon: LucideIcon;
    label: string;
    answer: string;
    className?: string;
}

function Keycap({ icon: Icon, label, answer, className }: KeycapProps) {
    return (
        <motion.div
            whileHover="hover"
            initial="initial"
            className={cn(
                "relative flex flex-col items-center justify-center p-6 rounded-2xl border border-white/10 bg-neutral-900 overflow-hidden cursor-default group backdrop-blur-sm transition-colors duration-300 hover:border-cyan-500/30",
                className
            )}
        >
            {/* Glow Effect */}
            <motion.div
                variants={{
                    initial: { opacity: 0 },
                    hover: { opacity: 1 },
                }}
                className="absolute inset-0 bg-cyan-500/5" // Subtle cyan tint
            />

            {/* Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center">
                {/* Default State: Icon + Label */}
                <motion.div
                    variants={{
                        initial: { opacity: 1, y: 0, scale: 1 },
                        hover: { opacity: 0, y: -10, scale: 0.9 },
                    }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                >
                    <Icon className="w-8 h-8 text-neutral-400 group-hover:text-cyan-400 transition-colors" />
                    <span className="font-mono text-xs text-neutral-500 tracking-wider uppercase group-hover:text-cyan-500/70 transition-colors">
                        {label}
                    </span>
                </motion.div>

                {/* Hover State: Answer */}
                <motion.div
                    variants={{
                        initial: { opacity: 0, y: 10 },
                        hover: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="absolute inset-0 flex items-center justify-center p-4"
                >
                    <p className="font-sans text-sm md:text-base text-cyan-100 font-medium leading-tight">
                        {answer}
                    </p>
                </motion.div>
            </div>

            {/* Keycap Bevel/Depth (Visual nuance) */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-2xl pointer-events-none" />
        </motion.div>
    );
}

export default function KeyboardFaq() {
    return (
        <section className="py-32 px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="text-center mb-16">
                <h2 className="text-2xl font-mono text-neutral-200">
                    SYSTEM_FAQ_MODULE
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[160px]">
                {/* Key 1: SPEED (1x1) */}
                <Keycap
                    icon={Clock}
                    label="SPEED"
                    answer="MVP in 21 Days."
                    className="col-span-1"
                />

                {/* Key 2: COST (2x1) */}
                <Keycap
                    icon={Wallet}
                    label="COST"
                    answer="High-ROI investment."
                    className="col-span-1 md:col-span-2"
                />

                {/* Key 4: AI (1x1) - Placed here to fill Row 1 in 4-col grid */}
                <Keycap
                    icon={Cpu}
                    label="AI"
                    answer="Automated Agents included."
                    className="col-span-1"
                />

                {/* Key 3: SECURITY (2x2 - Tall/Big) */}
                <Keycap
                    icon={Shield}
                    label="SECURITY"
                    answer="Aviation-grade protocols & ISO standards."
                    className="col-span-1 md:col-span-2 md:row-span-2 !text-lg"
                />

                {/* Key 5: STACK (1x1) */}
                <Keycap
                    icon={Zap}
                    label="STACK"
                    answer="Next.js 15 + Tailwind."
                    className="col-span-1 md:col-span-1"
                />

                {/* Filler Key to balance grid if needed, or stretch Key 5. 
             Grid status:
             Row 1: [1][2-2][4] = 4 cols.
             Row 2: [3-2][3-2][5][Empty].
             To fill the gap at [Row 2, Col 4] and [Row 3, Col 3-4] if 3 is 2x2.
             Actually, if 3 is 2x2:
             R2C1, R2C2 occupied by 3.
             R2C3 occupied by 5.
             R2C4 is Empty.
             R3C1, R3C2 occupied by 3 (if 2x2).
             R3C3, R3C4 Empty.

             Let's change Layout to be tighter.
             [K3 (2x2)] [K1] [K4]
             [K3 (2x2)] [K2 (2)]
             [K5 (2)] [Filler (2)] ??
             
             Let's try a simpler layout that fits 5 keys in 4 cols.
             [K1][K2 (2)][K4]
             [K3 (2x2)] [K5 (2 wide)]
             Total: 3 rows? No. K3 is 2 rows high.
             Row 2: K3(2) + K5(2) = 4. Perfect!
             K5 will be Wide to match grid.
          */}
                <Keycap
                    icon={Zap}
                    label="STACK"
                    answer="Next.js 15 + Tailwind."
                    className="col-span-1 md:col-span-2"
                // Made wide to fit the grid perfectly next to the 2x2 Security key
                />
            </div>
        </section>
    );
}
