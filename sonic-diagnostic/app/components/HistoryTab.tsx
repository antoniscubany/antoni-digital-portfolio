'use client';
import { motion } from 'framer-motion';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import { RefreshCcw, FileAudio, Mic, Wrench } from 'lucide-react';
import { springSmooth } from './types';

export default function HistoryTab({ diagnosisHistory, isFetchingHistory, isSignedIn }: {
  diagnosisHistory: any[]; isFetchingHistory: boolean; isSignedIn: boolean;
}) {
  const getIcon = (cat: string) => {
    if (cat === 'Rower') return <Wrench className="w-4.5 h-4.5 text-[#22c55e]" />;
    if (cat === 'Silnik') return <Mic className="w-4.5 h-4.5 text-[#f59e0b]" />;
    return <FileAudio className="w-4.5 h-4.5" />;
  };
  const getCatColor = (cat: string) => {
    if (cat === 'Rower') return 'bg-[#22c55e]/12';
    if (cat === 'Silnik') return 'bg-[#f59e0b]/12';
    return '';
  };
  const getSevColor = (sev: string, type: 'bg' | 'text' | 'border') => {
    if (sev === 'CRITICAL') return type === 'bg' ? 'bg-red-500/12' : type === 'text' ? 'text-red-400' : 'rgba(239,68,68,0.55)';
    if (sev === 'SAFE') return type === 'bg' ? 'bg-[#10b981]/12' : type === 'text' ? 'text-[#10b981]' : 'rgba(16,185,129,0.55)';
    return type === 'bg' ? 'bg-[#f59e0b]/12' : type === 'text' ? 'text-[#f59e0b]' : 'rgba(245,158,11,0.55)';
  };

  return (
    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={springSmooth} className="absolute inset-0 overflow-y-auto">
      <div className="px-5 pt-2 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[22px] font-bold text-white">Historia</h2>
          {isFetchingHistory && <RefreshCcw className="w-4 h-4 text-white/22 animate-spin" />}
        </div>
        {!isSignedIn ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <FileAudio className="w-6 h-6 text-white/18" />
            </div>
            <p className="text-[14px] text-white/55 mb-5">Zaloguj się, aby przeglądać historię</p>
            <SignInButton mode="modal">
              <button className="px-6 py-2.5 rounded-full text-[13px] font-medium text-white/65 hover:text-white/80"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>Zaloguj się</button>
            </SignInButton>
          </div>
        ) : isFetchingHistory && diagnosisHistory.length === 0 ? (
          <div className="flex justify-center py-16"><RefreshCcw className="w-4 h-4 text-white/15 animate-spin" /></div>
        ) : diagnosisHistory.length === 0 ? (
          <div className="rounded-2xl p-8 text-center opacity-40" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[13px] text-white/40">Historia jest pusta</p>
            <p className="text-[11px] text-white/24 mt-1">Nowe skany pojawią się tutaj</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {diagnosisHistory.map((item, i) => (
              <motion.div key={item.id || i} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.28), ...springSmooth }}
                className="rounded-2xl p-4 overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  borderLeft: `3px solid ${getSevColor(item.severity, 'border')}` }}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.machineCategory === 'Rower' ? getCatColor('Rower') : item.machineCategory === 'Silnik' ? getCatColor('Silnik') : getSevColor(item.severity, 'bg')}`}>
                    {item.machineCategory === 'Rower' || item.machineCategory === 'Silnik'
                      ? getIcon(item.machineCategory)
                      : <FileAudio className={`w-4.5 h-4.5 ${getSevColor(item.severity, 'text')}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[14px] font-semibold text-white/90 leading-tight">{item.diagnosisTitle}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums ${getSevColor(item.severity, 'bg')} ${getSevColor(item.severity, 'text')}`}>
                        {item.confidenceScore}%
                      </span>
                    </div>
                    <p className="text-[11px] text-white/45 mt-1">
                      {new Date(item.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}<span className={item.machineCategory === 'Rower' ? 'text-[#22c55e]/70' : item.machineCategory === 'Silnik' ? 'text-[#f59e0b]/70' : 'text-white/45'}>
                        {item.machineCategory}</span>
                      {item.makeModel ? ` (${item.makeModel})` : ''}
                    </p>
                  </div>
                </div>
                {item.actionPlan && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-[12px] text-white/55 line-clamp-2 leading-relaxed">{item.actionPlan}</p>
                    {item.repairCost && <p className="text-[11px] text-[#f59e0b]/70 mt-1.5 font-semibold">{item.repairCost}</p>}
                  </div>
                )}
              </motion.div>
            ))}
            <p className="text-center text-[10px] text-white/22 uppercase tracking-[0.14em] mt-3">Koniec historii</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
