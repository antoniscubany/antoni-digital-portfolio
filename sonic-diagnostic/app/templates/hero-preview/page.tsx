"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Star,
    ShieldCheck,
    ArrowRight,
    Phone,
    MapPin,
    CheckCircle2,
    Sparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   DEFAULTS
   ═══════════════════════════════════════════════════════ */

const DEFAULTS = {
    company: "Twoja Firma",
    city: "Twoje Miasto",
    niche: "Usługi Profesjonalne",
};

/* ═══════════════════════════════════════════════════════
   WRAPPER — Suspense boundary required for useSearchParams
   ═══════════════════════════════════════════════════════ */

export default function HeroPreviewPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
            }
        >
            <HeroContent />
        </Suspense>
    );
}

/* ═══════════════════════════════════════════════════════
   HERO CONTENT
   ═══════════════════════════════════════════════════════ */

function HeroContent() {
    const params = useSearchParams();

    const company = params.get("company") || DEFAULTS.company;
    const city = params.get("city") || DEFAULTS.city;
    const niche = params.get("niche") || DEFAULTS.niche;

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* ── Top bar ── */}
            <nav className="w-full border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <span className="text-lg font-bold tracking-tight text-gray-900">
                        {company}
                    </span>
                    <a
                        href={`tel:+48000000000`}
                        className="hidden sm:flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                        <Phone className="w-4 h-4" />
                        +48 000 000 000
                    </a>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="max-w-7xl mx-auto px-6 py-16 md:py-24 lg:py-32">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* LEFT — Text */}
                    <div className="order-2 lg:order-1">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mb-6 border border-blue-100">
                            <Sparkles className="w-3.5 h-3.5" />
                            {niche} — {city}
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold leading-[1.1] tracking-tight text-gray-900 mb-6">
                            {niche}{" "}
                            <span className="text-blue-600">na miarę XXI wieku.</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-lg md:text-xl text-gray-500 leading-relaxed mb-8 max-w-lg">
                            Profesjonalne usługi{" "}
                            <span className="text-gray-700 font-medium">{niche}</span> w
                            mieście{" "}
                            <span className="text-gray-700 font-medium">{city}</span>. Zadbaj
                            o swoich klientów z firmą{" "}
                            <span className="text-gray-700 font-medium">{company}</span>.
                        </p>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-10">
                            <button className="group flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-700/30 transition-all duration-300 cursor-pointer">
                                Umów Wizytę
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                            <button className="flex items-center justify-center gap-2 px-7 py-3.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all duration-300 cursor-pointer">
                                <Phone className="w-4 h-4" />
                                Zadzwoń do nas
                            </button>
                        </div>

                        {/* Trust Badges */}
                        <div className="flex flex-wrap gap-6">
                            <TrustBadge
                                icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                                label="5.0 w Google"
                                sublabel="128 opinii"
                            />
                            <TrustBadge
                                icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                label="Certyfikowana Jakość"
                                sublabel="ISO 9001"
                            />
                            <TrustBadge
                                icon={<MapPin className="w-4 h-4 text-blue-500" />}
                                label={city}
                                sublabel="Twoja okolicy"
                            />
                        </div>
                    </div>

                    {/* RIGHT — Image Placeholder */}
                    <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
                        <div className="relative w-full max-w-md aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 border border-gray-100 shadow-xl shadow-blue-100/40">
                            {/* Decorative grid */}
                            <div
                                className="absolute inset-0 opacity-[0.035]"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(#1e40af 1px, transparent 1px), linear-gradient(90deg, #1e40af 1px, transparent 1px)",
                                    backgroundSize: "32px 32px",
                                }}
                            />

                            {/* Content placeholder */}
                            <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-blue-600/10 flex items-center justify-center">
                                    <Sparkles className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="text-sm font-semibold text-gray-400 text-center tracking-wide">
                                    {company}
                                </p>
                                <p className="text-xs text-gray-300 text-center">
                                    Tutaj pojawi się zdjęcie lub grafika
                                </p>
                            </div>

                            {/* Floating badge */}
                            <div className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-100 text-xs font-medium text-gray-700">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                Zaufało nam 200+ klientów
                            </div>

                            {/* Corner accents */}
                            <span className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-blue-200 rounded-tr-lg" />
                            <span className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-blue-200 rounded-bl-lg" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── URL Params Info (Dev Helper) ── */}
            <div className="max-w-7xl mx-auto px-6 pb-12">
                <div className="rounded-lg bg-gray-50 border border-gray-100 p-5">
                    <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">
                        🔧 Dynamic Params (edytuj URL)
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <ParamPill label="company" value={company} />
                        <ParamPill label="city" value={city} />
                        <ParamPill label="niche" value={niche} />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-3">
                        Przykład:{" "}
                        <code className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                            ?company=MediDent&city=Warszawa&niche=Stomatologia
                        </code>
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════ */

function TrustBadge({
    icon,
    label,
    sublabel,
}: {
    icon: React.ReactNode;
    label: string;
    sublabel: string;
}) {
    return (
        <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                {icon}
            </div>
            <div>
                <p className="text-sm font-semibold text-gray-800 leading-tight">
                    {label}
                </p>
                <p className="text-[11px] text-gray-400">{sublabel}</p>
            </div>
        </div>
    );
}

function ParamPill({ label, value }: { label: string; value: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-md border border-gray-200 text-xs">
            <span className="text-gray-400 font-mono">{label}=</span>
            <span className="text-gray-700 font-semibold">{value}</span>
        </span>
    );
}
