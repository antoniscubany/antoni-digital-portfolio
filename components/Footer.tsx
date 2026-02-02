export default function Footer() {
    return (
        <footer className="w-full border-t border-white/5 bg-black/40 backdrop-blur-md py-2 mt-auto z-40 relative">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] md:text-xs font-mono-data text-[var(--slate-grey)] uppercase tracking-wider">
                {/* Left: System Status */}
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    SYSTEM STATUS: ONLINE
                </div>

                {/* Center: Location */}
                <div className="hidden md:block">
                    OPERATING FROM: WARSAW, PL
                </div>

                {/* Right: Copyright */}
                <div className="opacity-60">
                    © {new Date().getFullYear()} ANTONI.LAB
                </div>
            </div>
        </footer>
    );
}
