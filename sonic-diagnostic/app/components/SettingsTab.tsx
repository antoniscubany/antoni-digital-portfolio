'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Zap, Globe, User, HelpCircle, ChevronRight, RefreshCcw, FileAudio, LayoutList, ChevronLeft } from 'lucide-react';
import { springSmooth } from './types';
import HistoryTab from './HistoryTab';

export default function SettingsTab({ credits, isRedirectingToStripe, handleBuyCredits, diagnosisHistory, isFetchingHistory, isSignedIn }: {
  credits: number | null; isRedirectingToStripe: boolean;
  handleBuyCredits: (pkg: '5_credits' | '15_credits') => void;
  diagnosisHistory: any[]; isFetchingHistory: boolean; isSignedIn: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={springSmooth} className="absolute inset-0 overflow-hidden flex flex-col">
      {/* View Header */}
      <div className="shrink-0 flex items-center gap-3 px-5 pt-3 pb-4">
        <AnimatePresence>
          {showHistory && (
            <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} 
              onClick={() => setShowHistory(false)} className="w-[38px] h-[38px] rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              <ChevronLeft className="w-5 h-5 text-white/80" />
            </motion.button>
          )}
        </AnimatePresence>
        <h2 className="text-[22px] font-bold text-white leading-none">{showHistory ? 'Historia Diagnoz' : 'Ustawienia'}</h2>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div key="main-settings" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={springSmooth} className="px-5 pb-10 space-y-5">
              
              {/* History Entry Point */}
              <button onClick={() => setShowHistory(true)} className="w-full text-left rounded-2xl p-4 flex items-center justify-between"
                style={{ background: 'linear-gradient(145deg, rgba(0,212,255,0.06), rgba(6,13,20,0.95))', border: '1px solid rgba(0,212,255,0.15)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)' }}>
                    <LayoutList className="w-5 h-5 text-[#00d4ff]" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-white leading-tight">Historia Diagnoz</h3>
                    <p className="text-[12px] text-white/55 mt-0.5">{diagnosisHistory.length} zapisanych skanów</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20" />
              </button>

              {/* Credits */}
              <div className="rounded-2xl p-5 relative overflow-hidden"
                style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.09), rgba(6,13,20,0.96))', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'rgba(245,158,11,0.12)', filter: 'blur(24px)' }} />
                <div className="flex items-start justify-between mb-4 relative">
                  <div>
                    <h3 className="text-[16px] font-bold text-white flex items-center gap-2 mb-1"><Zap className="w-4 h-4 text-[#f59e0b]" /> Pakiety Skanów</h3>
                    <p className="text-[12px] text-white/55 leading-relaxed max-w-[200px]">Kup kredyty i diagnozuj od ręki</p>
                  </div>
                  {credits !== null && (
                    <div className="text-right">
                      <p className="text-[26px] font-bold text-[#f59e0b] leading-none tabular-nums">{credits}</p>
                      <p className="text-[9px] text-white/28 uppercase tracking-wider mt-0.5">pozostało</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2.5 relative">
                  <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div><p className="text-[14px] font-semibold text-white/90">5 Skanów</p><p className="text-[11px] text-white/52 mt-0.5">Podstawowa Diagnoza</p></div>
                    <button onClick={() => handleBuyCredits('5_credits')} disabled={isRedirectingToStripe}
                      className="px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50" style={{ background: '#f59e0b', color: '#000' }}>29 PLN</button>
                  </div>
                  <div className="flex items-center justify-between p-3.5 rounded-xl relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.24)' }}>
                    <div className="absolute top-2 right-2 bg-[#f59e0b] text-black text-[8px] font-bold px-1.5 py-0.5 rounded-[3px] uppercase">BEST</div>
                    <div><p className="text-[14px] font-bold text-white">15 Skanów PRO</p><p className="text-[11px] text-white/55 mt-0.5">Dla mechaników · taniej</p></div>
                    <button onClick={() => handleBuyCredits('15_credits')} disabled={isRedirectingToStripe}
                      className="px-4 py-2 rounded-lg text-[12px] font-bold disabled:opacity-50 mt-3" style={{ background: '#f59e0b', color: '#000' }}>69 PLN</button>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div>
                <p className="text-[10px] text-white/42 font-bold uppercase tracking-[0.16em] mb-3">Preferencje</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)' }}><Globe className="w-4 h-4 text-[#00d4ff]/55" /></div>
                      <div><p className="text-[14px] font-medium text-white/82">Język</p><p className="text-[11px] text-white/48">Interfejs i diagnoza</p></div>
                    </div>
                    <div className="flex gap-1">
                      <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white/70" style={{ background: 'rgba(255,255,255,0.1)' }}>PL</span>
                      <span className="px-2.5 py-1 rounded-lg text-[11px] text-white/22">EN</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}><User className="w-4 h-4 text-[#f59e0b]/55" /></div>
                      <div><p className="text-[14px] font-medium text-white/82">Konto</p><p className="text-[11px] text-white/48">Zarządzaj profilem</p></div>
                    </div>
                    <SignedIn><UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} /></SignedIn>
                    <SignedOut><SignInButton mode="modal"><button className="text-[12px] text-[#00d4ff]/65 hover:text-[#00d4ff]">Zaloguj</button></SignInButton></SignedOut>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}><HelpCircle className="w-4 h-4 text-white/28" /></div>
                    <div><p className="text-[14px] font-medium text-white/82">Wsparcie</p><p className="text-[11px] text-white/48">FAQ & Kontakt</p></div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/14" />
                </div>
              </div>
              <div className="text-center pt-3 space-y-1">
                <p className="text-[10px] text-white/28 uppercase tracking-[0.14em]">Sonic Diagnostic v6.1</p>
                <p className="text-[10px] text-white/16">Powered by Anto-Lab</p>
              </div>
            </motion.div>
          ) : (
            <motion.div key="history-view" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={springSmooth} className="absolute inset-0">
              <HistoryTab diagnosisHistory={diagnosisHistory} isFetchingHistory={isFetchingHistory} isSignedIn={isSignedIn} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
