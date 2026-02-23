'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useLanguage } from './providers';
import { analyzeMedia } from './actions';
import {
  Mic, Settings, Sun, Moon, Globe, AlertTriangle,
  X, Cpu, Home, Factory, Wrench, RotateCcw, Activity
} from 'lucide-react';

// ── Types ──
type MachineCategory = 'auto' | 'home_appliance' | 'industrial' | null;

interface DiagnosticResult {
  severity?: string;
  diagnosis?: string;
  detected_source?: string;
  sound_profile?: string;
  estimated_cost?: string;
  action_plan?: string;
  error?: string;
}

const CATEGORIES: { id: MachineCategory; labelKey: string; icon: React.ReactNode }[] = [
  { id: 'auto', labelKey: 'cat.auto', icon: <Cpu className="w-5 h-5 mb-1" /> },
  { id: 'home_appliance', labelKey: 'cat.home', icon: <Home className="w-5 h-5 mb-1" /> },
  { id: 'industrial', labelKey: 'cat.industrial', icon: <Factory className="w-5 h-5 mb-1" /> },
];

export default function SonicDiagnostic() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // App State
  const [appState, setAppState] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Diagnostic Params
  const [machineCategory, setMachineCategory] = useState<MachineCategory>('auto'); // Defaulting to auto so it works 1-tap
  const [makeModel, setMakeModel] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [result, setResult] = useState<DiagnosticResult | null>(null);

  // Media refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 100dvh fix
  useEffect(() => {
    const setHeight = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    return () => window.removeEventListener('resize', setHeight);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Handlers ──
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const toggleLanguage = () => setLanguage(language === 'en' ? 'pl' : 'en');

  const startScan = async () => {
    setResult(null);
    setShowResult(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          setAppState('processing');

          const minDelay = new Promise(resolve => setTimeout(resolve, 2500));

          try {
            const [diagnosis] = await Promise.all([
              analyzeMedia(base64Audio, 'audio/webm', {
                category: machineCategory || 'unknown',
                makeModel,
                symptoms,
              }),
              minDelay
            ]);
            setResult(diagnosis);
            setAppState('result');
            setShowResult(true);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : t('report.error');
            setResult({ error: errorMsg });
            setAppState('result');
            setShowResult(true);
          }
        };
      };

      mediaRecorder.start();
      setAppState('recording');

      // Auto stop after 5 seconds to feel snappy like Shazam
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          stopScan();
        }
      }, 5000);

    } catch {
      console.error('Mic Error');
      alert('Microphone access denied. Please allow microphone permissions.');
      setAppState('idle');
    }
  };

  const stopScan = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const resetAll = () => {
    setAppState('idle');
    setShowResult(false);
    setResult(null);
  };

  if (!mounted) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .dvh-screen { height: 100vh; height: calc(var(--vh, 1vh) * 100); }
        .shazam-bg {
           background: radial-gradient(circle at 50% 50%, var(--bg-center) 0%, var(--bg-edge) 100%);
        }
        .hide-scroll::-webkit-scrollbar { display: none; }
      `}} />

      <div className={`dvh-screen w-full relative overflow-hidden transition-colors duration-700 ease-in-out font-sans ${theme === 'dark' ? 'dark text-white' : 'text-slate-900'} `}
        style={{
          '--bg-center': theme === 'dark' ? '#1e3a8a' : '#60a5fa', // blue-900 / blue-400
          '--bg-edge': theme === 'dark' ? '#020617' : '#eff6ff',   // slate-950 / blue-50
        } as React.CSSProperties}
      >
        <div className="absolute inset-0 shazam-bg opacity-40 transition-opacity duration-1000" />

        {/* HEADER */}
        <header className="relative z-20 flex justify-between items-center px-6 py-6 shrink-0">
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md hover:scale-105 active:scale-95 transition-all"
          >
            <Settings className="w-5 h-5 opacity-80" />
          </button>

          <div className="flex flex-col items-center">
            <h1 className="text-xl font-bold tracking-tight">{t('app.title')}</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-60 font-semibold">{t('app.subtitle')}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleLanguage}
              className="p-3 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md hover:scale-105 active:scale-95 transition-all"
            >
              <Globe className="w-5 h-5 opacity-80" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-3 rounded-full bg-black/5 dark:bg-white/10 backdrop-blur-md hover:scale-105 active:scale-95 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 opacity-80" /> : <Moon className="w-5 h-5 opacity-80" />}
            </button>
          </div>
        </header>

        {/* MAIN IDLE / LISTENING UI */}
        <div className="relative z-10 flex-1 h-full flex flex-col items-center justify-center -mt-20">

          {/* Central Animated Shazam Button */}
          <div className="relative flex justify-center items-center">
            <AnimatePresence>
              {appState === 'recording' && (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: 3.5, opacity: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.5, ease: 'easeOut' }}
                      className="absolute rounded-full bg-blue-500/30 dark:bg-blue-400/20 aspect-square h-full"
                    />
                  ))}
                </>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {appState === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute w-full h-full rounded-full border-4 border-blue-500/50 border-t-white animate-spin"
                />
              )}
            </AnimatePresence>

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (appState === 'idle') startScan();
                else if (appState === 'recording') stopScan();
              }}
              className={`
                relative z-20 w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500
                ${appState === 'recording'
                  ? 'bg-blue-600 shadow-[0_0_80px_rgba(37,99,235,0.6)] text-white scale-105'
                  : appState === 'processing'
                    ? 'bg-blue-500/80 text-white cursor-wait scale-95'
                    : 'bg-white text-blue-600 dark:bg-white/10 dark:text-white dark:backdrop-blur-xl'}
              `}
            >
              <Mic className={`w-14 h-14 mb-2 transition-all duration-300 ${appState === 'recording' ? 'scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]' : ''}`} />
              <span className="text-xs font-bold uppercase tracking-widest opacity-80">
                {appState === 'idle' ? t('btn.tapToScan') : appState === 'recording' ? t('btn.listening') : t('btn.processing')}
              </span>
            </motion.button>
          </div>
        </div>

        {/* BOTTOM SHEET: SETTINGS */}
        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowSettings(false)}
                className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white dark:bg-slate-900 rounded-t-[2.5rem] z-50 p-6 shadow-2xl flex flex-col"
              >
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold">{t('settings.title')}</h2>
                  <button onClick={() => setShowSettings(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto hide-scroll pb-20 flex flex-col gap-6">
                  {/* Category */}
                  <div>
                    <label className="text-xs uppercase tracking-widest font-semibold opacity-50 mb-3 block">
                      {t('settings.category')}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {CATEGORIES.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setMachineCategory(cat.id)}
                          className={`flex flex-col items-center justify-center p-4 rounded-3xl transition-all ${machineCategory === cat.id
                            ? 'bg-blue-600 text-white shadow-lg scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 opacity-70 hover:opacity-100'
                            }`}
                        >
                          {cat.icon}
                          <span className="text-[10px] font-bold mt-1 text-center leading-tight">{t(cat.labelKey)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Make/Model */}
                  <div>
                    <label className="text-xs uppercase tracking-widest font-semibold opacity-50 mb-3 block">
                      {t('settings.make')}
                    </label>
                    <input
                      type="text"
                      value={makeModel}
                      onChange={e => setMakeModel(e.target.value)}
                      placeholder="e.g. BMW E46"
                      className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 font-medium focus:outline-none focus:ring-2 ring-blue-500"
                    />
                  </div>

                  {/* Symptoms */}
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs uppercase tracking-widest font-semibold opacity-50 mb-3 block">
                      {t('settings.symptoms')}
                    </label>
                    <textarea
                      value={symptoms}
                      onChange={e => setSymptoms(e.target.value)}
                      placeholder="..."
                      className="flex-1 min-h-[100px] w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 font-medium focus:outline-none focus:ring-2 ring-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full py-5 rounded-full bg-blue-600 text-white font-bold tracking-widest uppercase text-xs shadow-xl active:scale-95 transition-transform"
                  >
                    {t('settings.save')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* FULLSCREEN OVERLAY: RESULT */}
        <AnimatePresence>
          {showResult && result && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-white dark:bg-[#020617] z-50 flex flex-col overflow-hidden"
            >
              {/* Result Header */}
              <div className="p-6 pt-10 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-bold">{t('report.title')}</h2>
                <button onClick={resetAll} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full hover:scale-105 active:scale-95">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-24 hide-scroll">
                {result.error ? (
                  <div className="h-full flex flex-col items-center justify-center text-center pb-20">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                      <AlertTriangle className="w-12 h-12 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{t('report.error')}</h3>
                    <p className="opacity-60">{result.error}</p>
                  </div>
                ) : (
                  <div className="space-y-6">

                    {/* Priority Hero Card */}
                    <div className={`p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden ${result.severity === 'CRITICAL' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                      result.severity === 'MEDIUM' ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                        result.severity === 'INFO' ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                          'bg-gradient-to-br from-emerald-500 to-emerald-700'
                      }`}>
                      <div className="absolute top-0 right-0 p-6 opacity-20"><Activity className="w-32 h-32" /></div>
                      <div className="relative z-10">
                        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-md inline-block mb-4">
                          {result.severity} {t('report.severity')}
                        </span>
                        <h3 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-2 pr-10">{result.diagnosis}</h3>
                        <p className="text-sm font-semibold opacity-80 uppercase tracking-widest">{t('report.source')}: {result.detected_source}</p>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-50 block mb-2">{t('report.signature')}</span>
                        <p className="font-medium">{result.sound_profile}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem]">
                        <span className="text-xs font-bold uppercase tracking-widest opacity-50 block mb-2">{t('report.cost')}</span>
                        <p className="text-xl font-bold">{result.estimated_cost}</p>
                      </div>
                    </div>

                    {/* Action Plan */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-6 rounded-[2rem]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-800/50 rounded-full"><Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
                        <h4 className="font-bold uppercase tracking-widest text-sm text-blue-800 dark:text-blue-300">{t('report.action')}</h4>
                      </div>
                      <p className="font-medium leading-relaxed italic opacity-80 text-blue-900 dark:text-blue-100">
                        &quot;{result.action_plan}&quot;
                      </p>
                    </div>

                  </div>
                )}
              </div>

              {/* Floating Bottom Action */}
              <div className="absolute bottom-6 left-6 right-6">
                <button
                  onClick={resetAll}
                  className="w-full py-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold uppercase tracking-widest text-xs flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-2xl"
                >
                  <RotateCcw className="w-4 h-4" />
                  {t('report.newScan')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}