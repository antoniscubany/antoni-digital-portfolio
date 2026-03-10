'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X, RefreshCcw } from 'lucide-react';
import { identifyEngine } from '../actions';
import { springSmooth } from './types';

export default function EngineTab({ credits, onNeedCredits }: { credits: number | null; onNeedCredits: () => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const [countdown, setCountdown] = useState(8);
  const [result, setResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    if (credits !== null && credits < 1) { onNeedCredits(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      setCountdown(8);
      setResult(null);

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, 'engine_recording.webm');
        setState('processing');
        const res = await identifyEngine(fd);
        if (res?.error === 'OUT_OF_CREDITS') { onNeedCredits(); setState('idle'); return; }
        setResult(res);
        setState('idle');
      };

      mr.start();
      setState('recording');
      let sec = 8;
      countdownRef.current = setInterval(() => {
        sec--; setCountdown(sec);
        if (sec <= 0 && countdownRef.current) clearInterval(countdownRef.current);
      }, 1000);
      setTimeout(() => {
        if (mr.state !== 'inactive') { mr.stop(); stream.getTracks().forEach(t => t.stop()); }
        if (countdownRef.current) clearInterval(countdownRef.current);
      }, 8000);
    } catch { alert('Błąd mikrofonu. Sprawdź uprawnienia.'); }
  }, [credits, onNeedCredits]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    setState('idle');
  }, []);

  return (
    <motion.div key="engine" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }} className="absolute inset-0 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <motion.h2 className="text-[22px] font-bold text-white tracking-tight mb-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          Wykryj Silnik
        </motion.h2>
        <p className="text-[13px] text-white/40 mb-10 text-center max-w-[260px]">
          Nagraj dźwięk silnika — AI rozpozna jaki to silnik
        </p>

        {/* Recording UI */}
        {state === 'recording' || state === 'processing' ? (
          <div className="relative flex flex-col items-center">
            {state === 'recording' && [0, 0.7, 1.4].map((delay, i) => (
              <motion.div key={`ep-${i}`} className="absolute rounded-full"
                style={{ width: 180, height: 180, border: '1px solid rgba(245,158,11,0.15)' }}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 3.5 + i * 0.3, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 3, delay, ease: 'easeOut' }} />
            ))}
            <motion.div className="relative z-10 w-[160px] h-[160px] rounded-full flex flex-col items-center justify-center"
              style={{ background: 'radial-gradient(circle at 38% 32%, rgba(140,80,0,0.9), rgba(20,13,6,0.98))',
                boxShadow: '0 0 0 1px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.18)' }}
              animate={state === 'processing' ? { scale: [1, 0.94, 1] } : { scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
              {state === 'processing' ? (
                <motion.div className="w-9 h-9 rounded-full" style={{ border: '2px solid rgba(245,158,11,0.15)', borderTopColor: '#f59e0b' }}
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
              ) : (
                <button onClick={stopRecording}>
                  <X className="w-8 h-8 text-[#f59e0b]" />
                </button>
              )}
            </motion.div>
            {state === 'recording' && (
              <motion.div className="mt-8 flex items-center gap-2" key={countdown}
                initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
                <span className="text-3xl font-bold text-white tabular-nums">{countdown}</span>
                <span className="text-white/25 text-lg font-light">s</span>
              </motion.div>
            )}
            <p className="text-sm text-white/30 mt-4">
              {state === 'processing' ? 'Identyfikacja silnika…' : 'Zbliż mikrofon do silnika'}
            </p>
          </div>
        ) : (
          <>
            {/* Idle button */}
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute rounded-full w-[220px] h-[220px]" style={{ border: '1px solid rgba(245,158,11,0.08)' }} />
              <div className="absolute rounded-full w-[280px] h-[280px]" style={{ border: '1px solid rgba(245,158,11,0.04)' }} />
              <motion.button onClick={startRecording}
                className="relative z-10 w-[180px] h-[180px] rounded-full flex flex-col items-center justify-center gap-3"
                style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
                  boxShadow: '0 0 0 1px rgba(245,158,11,0.15), 0 24px 64px rgba(0,0,0,0.4)' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
                <Mic className="w-12 h-12 text-[#f59e0b]/80" />
                <span className="text-[11px] text-[#f59e0b]/60 font-bold tracking-[0.2em] uppercase">Nagraj</span>
              </motion.button>
            </div>

            {/* Result */}
            <AnimatePresence>
              {result && !result.error && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={springSmooth} className="w-full max-w-sm space-y-3">
                  <div className="rounded-2xl p-5 text-center"
                    style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.09), rgba(6,13,20,0.95))',
                      border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-[10px] text-[#f59e0b]/60 uppercase tracking-wider mb-2 font-bold">Wykryty Silnik</p>
                    <h3 className="text-[20px] font-bold text-white mb-3">{result.engine_name}</h3>
                    <div className="flex items-center justify-center gap-4 mb-3">
                      <div className="text-center">
                        <p className="text-[28px] font-bold text-[#f59e0b] tabular-nums">{result.confidence_percent}%</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">pewność</p>
                      </div>
                      <div className="w-px h-10" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      <div className="text-center">
                        <p className="text-[16px] font-semibold text-white/80">{result.engine_type}</p>
                        <p className="text-[9px] text-white/30 uppercase tracking-wider">typ</p>
                      </div>
                    </div>
                    {result.displacement && (
                      <p className="text-[13px] text-white/50">{result.displacement} · {result.cylinders}</p>
                    )}
                  </div>
                  {result.sound_description && (
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[10px] text-white/42 uppercase tracking-wider mb-2 font-bold">Analiza Dźwięku</p>
                      <p className="text-[12px] text-white/65 leading-relaxed">{result.sound_description}</p>
                    </div>
                  )}
                  {result.possible_cars && (
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p className="text-[10px] text-white/42 uppercase tracking-wider mb-2 font-bold">Możliwe Auta</p>
                      <p className="text-[12px] text-white/65 leading-relaxed">{result.possible_cars}</p>
                    </div>
                  )}
                  <button onClick={() => setResult(null)}
                    className="flex items-center gap-1.5 mx-auto text-[11px] text-white/30 hover:text-white/60 transition-colors mt-2">
                    <RefreshCcw className="w-3 h-3" /> Nowe nagranie
                  </button>
                </motion.div>
              )}
              {result?.error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-sm text-red-300/80">{result.error}</p>
                  <button onClick={() => setResult(null)} className="mt-3 text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1.5 mx-auto">
                    <RefreshCcw className="w-3 h-3" /> Spróbuj ponownie
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
}
