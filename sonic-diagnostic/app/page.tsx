'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Upload, FileText, X, Home, Search, Settings, Bike,
  RefreshCcw, AlertTriangle, Wrench, FileAudio,
  ChevronRight, Zap, Send, MessageCircle, Target
} from 'lucide-react';
import {
  analyzeMedia, getUserDiagnosisHistory,
  getUserCredits, addPurchasedCredits, askMechanic
} from './actions';
import { useUser } from '@clerk/nextjs';
import SplashScreen from './components/SplashScreen';
import EngineTab from './components/EngineTab';
import BikeTab from './components/BikeTab';
import ChatTab from './components/ChatTab';
import SettingsTab from './components/SettingsTab';
import { TabId, ScannerState, ChatMsg, springBouncy, springSmooth, ANALYSIS_GOALS, FUEL_TYPES } from './components/types';

export default function SonicDiagnostic() {
  /* ── UI state ── */
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [showContextSheet, setShowContextSheet] = useState(false);
  const [pendingAction, setPendingAction] = useState<'record' | 'analyze' | null>(null);
  const [showResults, setShowResults] = useState(false);

  /* ── User / credits ── */
  const { isLoaded, isSignedIn, user } = useUser();
  const [diagnosisHistory, setDiagnosisHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ── Car Context (new specific fields) ── */
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [rokProdukcji, setRokProdukcji] = useState('');
  const [przebieg, setPrzebieg] = useState('');
  const [typPaliwa, setTypPaliwa] = useState('');
  const [symptoms, setSymptoms] = useState('');

  /* ── Analysis Goal ── */
  const [analysisGoal, setAnalysisGoal] = useState('Wykryj usterkę');
  const [customGoal, setCustomGoal] = useState('');
  const [showCustomGoal, setShowCustomGoal] = useState(false);

  /* ── Recording / File ── */
  const [result, setResult] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [countdown, setCountdown] = useState(12);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  /* ── Chat ── */
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInitRef = useRef(false);

  const effectiveGoal = showCustomGoal ? customGoal : analysisGoal;

  /* ── Data fetching ── */
  const fetchUserData = useCallback(async () => {
    if (!isSignedIn) { setDiagnosisHistory([]); setCredits(null); return; }
    setIsFetchingHistory(true);
    try {
      const [history, userCredits] = await Promise.all([getUserDiagnosisHistory(), getUserCredits()]);
      setDiagnosisHistory(history || []);
      setCredits(userCredits);
    } catch { /* silent */ } finally { setIsFetchingHistory(false); }
  }, [isSignedIn]);

  useEffect(() => { if (isLoaded) fetchUserData(); }, [isLoaded, isSignedIn, fetchUserData]);

  /* ── Stripe ── */
  const handleBuyCredits = async (packageId: '5_credits' | '15_credits') => {
    try {
      setIsRedirectingToStripe(true);
      const res = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId }) });
      if (!res.ok) throw new Error('Checkout failed');
      const { url } = await res.json();
      window.location.href = url;
    } catch { alert('Błąd płatności.'); setIsRedirectingToStripe(false); }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isSignedIn && user) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('success')) {
        addPurchasedCredits(user.id, 5).then(() => {
          setToastMessage('Płatność zrealizowana! Kredyty zasilone.');
          window.history.replaceState(null, '', window.location.pathname);
          fetchUserData();
        });
      }
    }
  }, [fetchUserData, isSignedIn, user]);

  useEffect(() => { if (!toastMessage) return; const t = setTimeout(() => setToastMessage(null), 5000); return () => clearTimeout(t); }, [toastMessage]);

  /* ── Recording ── */
  const startRecording = useCallback(async () => {
    if (credits !== null && credits < 1) { setShowCreditModal(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
      });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      setCountdown(12);
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, 'recording.webm');
        fd.append('analysisGoal', effectiveGoal);
        fd.append('marka', marka); fd.append('model', model);
        fd.append('rokProdukcji', rokProdukcji); fd.append('przebieg', przebieg);
        fd.append('typPaliwa', typPaliwa); fd.append('symptoms', symptoms);
        setScannerState('processing');
        const diag = await analyzeMedia(fd);
        if (diag?.error === 'OUT_OF_CREDITS') { setShowCreditModal(true); setScannerState('idle'); return; }
        setResult(diag); setScannerState('idle'); setShowResults(true);
        if (diag?.chat_opener) { setChatMessages([{ role: 'model', content: diag.chat_opener }]); chatInitRef.current = true; }
        fetchUserData();
      };
      mr.start(); setScannerState('recording');
      let sec = 12;
      countdownRef.current = setInterval(() => { sec--; setCountdown(sec); if (sec <= 0 && countdownRef.current) clearInterval(countdownRef.current); }, 1000);
      setTimeout(() => { if (mr.state !== 'inactive') { mr.stop(); stream.getTracks().forEach(t => t.stop()); setScannerState('processing'); } if (countdownRef.current) clearInterval(countdownRef.current); }, 12000);
    } catch { alert('Błąd mikrofonu.'); }
  }, [marka, model, rokProdukcji, przebieg, typPaliwa, symptoms, credits, fetchUserData, effectiveGoal]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop()); }
    if (countdownRef.current) clearInterval(countdownRef.current);
    setScannerState('idle');
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadedFile(file); setScannerState('fileReady');
    if (!marka && !symptoms) { setPendingAction('analyze'); setShowContextSheet(true); }
  };

  const analyzeUploadedFile = async () => {
    if (!uploadedFile) return;
    if (credits !== null && credits < 1) { setShowCreditModal(true); return; }
    const fd = new FormData();
    fd.append('file', uploadedFile); fd.append('analysisGoal', effectiveGoal);
    fd.append('marka', marka); fd.append('model', model);
    fd.append('rokProdukcji', rokProdukcji); fd.append('przebieg', przebieg);
    fd.append('typPaliwa', typPaliwa); fd.append('symptoms', symptoms);
    setScannerState('processing');
    const diag = await analyzeMedia(fd);
    if (diag?.error === 'OUT_OF_CREDITS') { setShowCreditModal(true); setScannerState('idle'); setUploadedFile(null); return; }
    setResult(diag); setScannerState('idle'); setUploadedFile(null); setShowResults(true);
    if (diag?.chat_opener) { setChatMessages([{ role: 'model', content: diag.chat_opener }]); chatInitRef.current = true; }
    fetchUserData();
  };

  const resetScan = () => { setShowResults(false); setResult(null); setUploadedFile(null); setScannerState('idle'); fetchUserData(); };

  /* ── Chat ── */
  const activeContext = result
    ? `Auto: ${marka} ${model}. Objawy: ${symptoms}. Diagnoza: ${result.diagnosis_title} (${result.severity}, ${result.confidence_score}%). Wyjaśnienie: ${result.human_explanation}`
    : undefined;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatLoading]);

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim(); if (!msg || isChatLoading) return;
    setChatInput('');
    const updated: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(updated); setIsChatLoading(true);
    try {
      const res = await askMechanic(updated, activeContext, diagnosisHistory);
      setChatMessages(prev => [...prev, { role: 'model', content: res.error ? res.error : (res.content ?? '…') }]);
    } catch { setChatMessages(prev => [...prev, { role: 'model', content: 'Przepraszam, wystąpił błąd.' }]); }
    finally { setIsChatLoading(false); }
  }, [chatInput, chatMessages, isChatLoading, activeContext, diagnosisHistory]);

  const isListening = scannerState === 'recording' || scannerState === 'processing';

  /* ── SPLASH ── */
  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} />;

  /* ── RECORDING/PROCESSING FULLSCREEN ── */
  if (isListening) {
    return (
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="app-container relative w-full h-full flex flex-col items-center justify-center">
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            onClick={stopRecording} className="absolute top-12 left-5 z-20 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <X className="w-4 h-4 text-white/60" />
          </motion.button>
          <div className="relative flex items-center justify-center">
            {scannerState === 'recording' && [0, 0.7, 1.4].map((delay, i) => (
              <motion.div key={`pulse-${i}`} className="absolute rounded-full"
                style={{ width: 200, height: 200, border: '1px solid rgba(0,212,255,0.15)' }}
                initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 3.8 + i * 0.35, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 3.2, delay, ease: 'easeOut' }} />
            ))}
            {['ring-recording-5','ring-recording-4','ring-recording-3','ring-recording-2','ring-recording-1'].map((cls, i) => (
              <motion.div key={cls} className={`absolute rounded-full shazam-ring ${cls}`}
                animate={scannerState === 'recording' ? { scale: [1, 1.015 + i*0.005, 1] } : {}}
                transition={{ repeat: Infinity, duration: 3.5 - i*0.4, ease: 'easeInOut', delay: i*0.1 }} />
            ))}
            <motion.div className="relative z-10 w-[164px] h-[164px] rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle at 38% 32%, rgba(0,80,140,0.9), rgba(6,13,20,0.98))',
                boxShadow: scannerState === 'recording' ? '0 0 0 1px rgba(0,212,255,0.2), 0 0 60px rgba(0,212,255,0.18)' : '0 0 0 1px rgba(255,255,255,0.07), 0 0 40px rgba(0,0,0,0.6)' }}
              animate={scannerState === 'processing' ? { scale: [1, 0.94, 1] } : { scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}>
              {scannerState === 'processing' ? (
                <motion.div className="w-9 h-9 rounded-full" style={{ border: '2px solid rgba(0,212,255,0.15)', borderTopColor: '#00d4ff' }}
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
              ) : (
                <Image src="/logo.png" alt="Sonic" width={76} height={76} className="opacity-90" />
              )}
            </motion.div>
          </div>
          <motion.div className="flex items-end gap-[4px] mt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            {[0, 0.12, 0.24, 0.36, 0.48].map((d, i) => (
              <div key={i} className="eq-bar eq-bar-cyan" style={{ animationDelay: `${d}s`, height: '20px' }} />
            ))}
          </motion.div>
          <motion.div className="text-center mt-7" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, ...springSmooth }}>
            <h2 className="text-[22px] font-bold text-white tracking-tight leading-none mb-2">
              {scannerState === 'processing' ? 'Analiza AI…' : 'Nasłuchiwanie'}
            </h2>
            <p className="text-sm text-white/28 max-w-[240px] mx-auto">{scannerState === 'processing' ? 'Anto-Lab analizuje nagranie…' : 'Zbliż mikrofon do źródła dźwięku'}</p>
            {scannerState === 'recording' && (
              <motion.div className="mt-5 flex items-center justify-center gap-2" key={countdown}
                initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-3xl font-bold text-white tabular-nums">{countdown}</span>
                <span className="text-white/25 text-lg font-light">s</span>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  /* ════════════════════ MAIN APP SHELL ════════════════════ */
  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#040B16' }}>
      <div className="app-container">
        {/* TOP HEADER */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)' }}>
          <button onClick={() => { setActiveTab('settings'); setShowResults(false); }} className="w-[38px] h-[38px] rounded-full flex items-center justify-center hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <Settings className="w-5 h-5 text-white/90" />
          </button>
          <div className="flex items-center gap-2.5">
            <SignedIn>
              {credits !== null && (
                <motion.button onClick={() => setShowCreditModal(true)} whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}>
                  <Zap className="w-3 h-3 text-[#f59e0b]" /><span className="text-[11px] text-[#f59e0b] font-bold tabular-nums">{credits}</span>
                </motion.button>
              )}
              <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-1.5 rounded-full text-xs font-medium text-white/60 hover:text-white/80"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>Zaloguj</button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {/* HOME TAB */}
            {activeTab === 'home' && !showResults && (
              <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="absolute inset-0 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center px-5 -mt-6">
                  <motion.h2 className="text-[26px] font-bold text-white tracking-tight leading-none mb-4"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>Tap to Sonic</motion.h2>

                  {/* Analysis Goal Selector */}
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="flex flex-wrap justify-center gap-2 mb-6 max-w-[340px]">
                    {ANALYSIS_GOALS.map(g => (
                      <button key={g} onClick={() => { setAnalysisGoal(g); setShowCustomGoal(false); }}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                        style={analysisGoal === g && !showCustomGoal
                          ? { background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }
                          : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {g}
                      </button>
                    ))}
                    <button onClick={() => setShowCustomGoal(!showCustomGoal)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all"
                      style={showCustomGoal
                        ? { background: 'rgba(0,212,255,0.12)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)' }
                        : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Inne…
                    </button>
                  </motion.div>
                  <AnimatePresence>
                    {showCustomGoal && (
                      <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        type="text" value={customGoal} onChange={e => setCustomGoal(e.target.value)}
                        placeholder="Wpisz cel analizy…"
                        className="w-full max-w-[300px] text-[13px] text-white/88 rounded-xl px-4 py-3 mb-4 outline-none placeholder:text-white/28 input-glow"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }} />
                    )}
                  </AnimatePresence>

                  {/* Ring system + button */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute rounded-full shazam-ring ring-idle-3" />
                    <div className="absolute rounded-full shazam-ring ring-idle-2" />
                    <div className="absolute rounded-full shazam-ring ring-idle-1" />
                    <motion.button
                      onClick={() => {
                        if (scannerState === 'idle') {
                          if (!marka && !symptoms) { setPendingAction('record'); setShowContextSheet(true); }
                          else startRecording();
                        } else if (scannerState === 'fileReady') {
                          if (!marka && !symptoms) { setPendingAction('analyze'); setShowContextSheet(true); }
                          else analyzeUploadedFile();
                        }
                      }}
                      className="relative z-10 w-[200px] h-[200px] rounded-full flex flex-col items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(24px)',
                        boxShadow: '0 0 0 1px rgba(255,255,255,0.12), 0 24px 64px rgba(0,0,0,0.4)' }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} transition={springBouncy}>
                      {scannerState === 'fileReady' ? (
                        <div className="flex flex-col items-center gap-2">
                          <Zap className="w-12 h-12 text-[#10b981]" style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.5))' }} />
                          <span className="text-[12px] text-[#10b981] font-bold tracking-[0.2em] uppercase mt-2">Analizuj</span>
                        </div>
                      ) : (
                        <Image src="/logo.png" alt="Sonic" width={82} height={82} style={{ filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
                      )}
                    </motion.button>
                  </div>

                  {/* Action pills */}
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex gap-2.5 mt-1">
                    <input type="file" accept="video/*,audio/*,image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <motion.button onClick={() => fileInputRef.current?.click()} whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}>
                      <Upload className="w-3.5 h-3.5 text-white/60" /><span className="text-[12px] text-white/68 font-medium">Upload</span>
                    </motion.button>
                    <motion.button onClick={() => { setPendingAction(null); setShowContextSheet(true); }} whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}>
                      <FileText className="w-3.5 h-3.5 text-[#f59e0b]/75" /><span className="text-[12px] text-white/68 font-medium">Kontekst</span>
                      {(marka || symptoms) && <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.8))' }} />}
                    </motion.button>
                  </motion.div>

                  {/* Uploaded file chip */}
                  <AnimatePresence>
                    {uploadedFile && (
                      <motion.div initial={{ opacity: 0, y: 5, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                        className="mt-3.5 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                        <FileAudio className="w-3.5 h-3.5 text-[#10b981]" />
                        <span className="text-[11px] text-white/55 truncate max-w-[170px]">{uploadedFile.name}</span>
                        <button onClick={() => { setUploadedFile(null); setScannerState('idle'); }} className="ml-auto shrink-0">
                          <X className="w-3 h-3 text-white/20 hover:text-white/50" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Recently Found */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="shrink-0 w-full pl-5 pb-5">
                  <p className="text-[15px] font-semibold text-white/70 mb-3">Recently Found</p>
                  {diagnosisHistory.filter(d => d.machineCategory === 'Auto').length > 0 ? (
                    <div className="flex overflow-x-auto gap-3.5 pr-5 pb-3 snap-x snap-mandatory scrollbar-hide">
                      {diagnosisHistory.filter(d => d.machineCategory === 'Auto').slice(0, 5).map(item => (
                        <motion.button key={item.id} onClick={() => setActiveTab('chat')} whileTap={{ scale: 0.97 }}
                          className="flex items-center gap-3.5 p-3.5 rounded-[22px] text-left shrink-0 w-[290px] snap-center"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className={`w-14 h-14 rounded-[14px] flex items-center justify-center shrink-0 ${item.severity === 'CRITICAL' ? 'bg-red-500/10' : item.severity === 'SAFE' ? 'bg-[#10b981]/10' : 'bg-[#f59e0b]/10'}`}>
                            <FileAudio className={`w-6 h-6 ${item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'SAFE' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`} />
                          </div>
                          <div className="flex-1 min-w-0 pr-1">
                            <p className="text-[15px] font-bold text-white/95 truncate">{item.diagnosisTitle}</p>
                            <p className="text-[13px] text-white/55 mt-0.5 truncate">{item.makeModel}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3.5 p-3.5 rounded-[22px] opacity-35 mr-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-14 h-14 rounded-[14px] bg-white/5 flex items-center justify-center"><FileAudio className="w-6 h-6 text-white/20" /></div>
                      <div><p className="text-[14px] font-bold text-white/70">Witaj w Sonic</p><p className="text-[12px] text-white/40 mt-0.5">Twoje wyniki pojawią się tutaj</p></div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* RESULTS */}
            {activeTab === 'home' && showResults && result && (
              <motion.div key="results" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={springSmooth} className="absolute inset-0 overflow-y-auto">
                <div className="px-5 pt-3 pb-6 space-y-3">
                  {result.error ? (
                    <div className="rounded-2xl p-8 text-center mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <AlertTriangle className="w-9 h-9 text-red-400 mx-auto mb-3" /><p className="text-sm text-red-300/80">{result.error}</p>
                      <button onClick={resetScan} className="mt-4 text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1.5 mx-auto"><RefreshCcw className="w-3 h-3" /> Ponownie</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-[16px] font-bold text-white/90 tracking-tight">Wynik Diagnostyki</h2>
                        <button onClick={resetScan} className="flex items-center gap-1 text-[10px] text-white/22 hover:text-white/45 font-medium uppercase tracking-wider">
                          <RefreshCcw className="w-3 h-3" /> Nowy
                        </button>
                      </div>
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, ...springSmooth }}
                        className="rounded-2xl p-5" style={{
                          background: result.severity === 'CRITICAL' ? 'linear-gradient(145deg, rgba(239,68,68,0.09), rgba(6,13,20,0.95))' : result.severity === 'SAFE' ? 'linear-gradient(145deg, rgba(16,185,129,0.09), rgba(6,13,20,0.95))' : 'linear-gradient(145deg, rgba(245,158,11,0.09), rgba(6,13,20,0.95))',
                          border: `1px solid ${result.severity === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : result.severity === 'SAFE' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                        <div className="flex items-center justify-between mb-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase ${result.severity === 'CRITICAL' ? 'bg-red-500/12 text-red-400' : result.severity === 'SAFE' ? 'bg-[#10b981]/12 text-[#10b981]' : 'bg-[#f59e0b]/12 text-[#f59e0b]'}`}>{result.severity}</span>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="text-[12px] text-white/65 font-semibold tabular-nums">{result.confidence_score}%</span>
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.09)' }}>
                              <div className="h-full rounded-full confidence-bar-fill" style={{ width: `${result.confidence_score}%`, background: result.confidence_score > 75 ? '#10b981' : result.confidence_score > 50 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                          </div>
                        </div>
                        <h3 className="text-[20px] font-bold text-white leading-tight mb-2.5">{result.diagnosis_title}</h3>
                        <p className="text-[13px] text-white/65 leading-relaxed">{result.human_explanation}</p>
                      </motion.div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, ...springSmooth }}
                          className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[10px] text-white/42 uppercase tracking-wider mb-2 font-bold">Analiza Dźwięku</p>
                          <p className="text-[12px] text-white/65 leading-relaxed line-clamp-5">{result.reasoning}</p>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ...springSmooth }}
                          className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <p className="text-[10px] text-white/42 uppercase tracking-wider mb-2 font-bold">Szacowany Koszt</p>
                          <p className="text-[17px] font-bold text-white/85">{result.cost_and_action?.match(/[\d,.]+\s*(?:PLN|zł)/i)?.[0] || '—'}</p>
                          <p className="text-[9px] text-white/20 mt-1">netto, szacunkowo</p>
                        </motion.div>
                      </div>
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, ...springSmooth }}
                        className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p className="text-[10px] text-[#f59e0b]/80 uppercase font-bold mb-2.5 flex items-center gap-1.5 tracking-wider"><Wrench className="w-3 h-3" /> Plan Działania</p>
                        <p className="text-[13px] text-white/65 leading-relaxed">{result.cost_and_action}</p>
                      </motion.div>
                      <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ...springSmooth }}
                        onClick={() => { if (!chatInitRef.current) { chatInitRef.current = true; setChatMessages([{ role: 'model', content: result.chat_opener || `Diagnoza: **${result.diagnosis_title}**. Masz pytania?` }]); } setShowResults(true); }}
                        whileTap={{ scale: 0.98 }} className="w-full rounded-2xl p-4 flex items-center gap-3.5"
                        style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(6,13,20,0.9))', border: '1px solid rgba(0,212,255,0.14)' }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.1)' }}>
                          <MessageCircle className="w-4.5 h-4.5 text-[#00d4ff]" />
                        </div>
                        <div className="flex-1 text-left"><p className="text-[13px] font-semibold text-white/80">Zapytaj AI Mechanika</p><p className="text-[11px] text-white/32 mt-0.5">Zadaj pytanie o diagnozę</p></div>
                        <ChevronRight className="w-4 h-4 text-[#00d4ff]/35 shrink-0" />
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* BIKE TAB */}
            {activeTab === 'bike' && <BikeTab credits={credits} onNeedCredits={() => setShowCreditModal(true)} fetchUserData={fetchUserData} />}

            {/* ENGINE TAB */}
            {activeTab === 'engine' && <EngineTab credits={credits} onNeedCredits={() => setShowCreditModal(true)} />}

            {/* CHAT TAB */}
            {activeTab === 'chat' && <ChatTab credits={credits} fetchUserData={fetchUserData} diagnosisHistory={diagnosisHistory} />}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && <SettingsTab credits={credits} isRedirectingToStripe={isRedirectingToStripe} handleBuyCredits={handleBuyCredits} diagnosisHistory={diagnosisHistory} isFetchingHistory={isFetchingHistory} isSignedIn={!!isSignedIn} />}
          </AnimatePresence>
        </div>

        {/* BOTTOM NAVIGATION */}
        <div className="shrink-0 px-5 pb-4 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
          <motion.nav initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18, ...springBouncy }}
            className="flex items-center justify-around px-2 py-2 rounded-[30px]"
            style={{ background: 'rgba(12,20,30,0.75)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)' }}>
            {([
              { id: 'home' as TabId, icon: Home, label: 'Auto' },
              { id: 'bike' as TabId, icon: Bike, label: 'Rower' },
              { id: 'engine' as TabId, icon: Target, label: 'Silnik' },
              { id: 'chat' as TabId, icon: MessageCircle, label: 'Chat' },
            ]).map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== 'home') setShowResults(false); }}
                  whileTap={{ scale: 0.9 }} className="relative flex flex-col items-center gap-1 px-3 py-2.5 rounded-[22px]">
                  {isActive && (
                    <motion.div layoutId="nav-bg" className="absolute inset-0 rounded-[22px]" style={{ background: 'rgba(255,255,255,0.1)' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }} />
                  )}
                  <tab.icon className={`w-[20px] h-[20px] relative z-10 transition-all duration-200 ${isActive ? 'text-white' : 'text-white/28'}`}
                    style={isActive ? { filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))' } : {}} />
                  <span className={`text-[10px] font-medium relative z-10 transition-colors duration-200 ${isActive ? 'text-white/80' : 'text-white/25'}`}>{tab.label}</span>
                </motion.button>
              );
            })}
          </motion.nav>
        </div>
      </div>

      {/* CONTEXT BOTTOM SHEET */}
      <AnimatePresence>
        {showContextSheet && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
              onClick={() => { setShowContextSheet(false); setPendingAction(null); }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ ...springBouncy, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] px-5 flex flex-col max-h-[85dvh] overflow-y-auto"
              style={{ background: 'rgba(10,18,28,0.92)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(60px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}>
              <div className="w-8 h-1 rounded-full mx-auto mt-3 mb-5 shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <h3 className={`text-[17px] font-bold text-white/88 shrink-0 ${pendingAction ? 'mb-1' : 'mb-5'}`}>Kontekst Pojazdu</h3>
              {pendingAction && <p className="text-[12px] text-white/55 mb-4">Czym więcej szczegółów, tym trafniejsza diagnoza. Możesz pominąć.</p>}

              <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Zdjęcie / Wideo usterki (Opcjonalnie)</label>
              {uploadedFile ? (
                <div className="relative rounded-2xl p-4 flex items-center justify-between mb-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileAudio className="w-5 h-5 text-[#10b981] shrink-0" />
                    <span className="text-[13px] text-white/88 truncate">{uploadedFile.name}</span>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); setUploadedFile(null); }} className="shrink-0 ml-2 p-1"><X className="w-4 h-4 text-white/40 hover:text-white" /></button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl mb-4 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.2)' }}>
                  <Upload className="w-4 h-4 text-white/60" />
                  <span className="text-[13px] text-white/60">Dodaj zdjęcie lub wideo</span>
                </button>
              )}

              <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Marka</label>
              <input type="text" placeholder="np. BMW, Toyota, Volkswagen" value={marka} onChange={e => setMarka(e.target.value)}
                className="w-full text-[14px] text-white/88 mb-4 rounded-xl p-4 outline-none placeholder:text-white/28 input-glow"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

              <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Model</label>
              <input type="text" placeholder="np. E46 320d, Corolla, Golf 7" value={model} onChange={e => setModel(e.target.value)}
                className="w-full text-[14px] text-white/88 mb-4 rounded-xl p-4 outline-none placeholder:text-white/28 input-glow"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Rok produkcji</label>
                  <input type="text" placeholder="np. 2015" value={rokProdukcji} onChange={e => setRokProdukcji(e.target.value)}
                    className="w-full text-[14px] text-white/88 rounded-xl p-4 outline-none placeholder:text-white/28 input-glow"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
                <div>
                  <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Przebieg</label>
                  <input type="text" placeholder="np. 180 000 km" value={przebieg} onChange={e => setPrzebieg(e.target.value)}
                    className="w-full text-[14px] text-white/88 rounded-xl p-4 outline-none placeholder:text-white/28 input-glow"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>

              <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2.5 block font-bold">Typ paliwa</label>
              <div className="flex flex-wrap gap-2 mb-5">
                {FUEL_TYPES.map(f => (
                  <button key={f} onClick={() => setTypPaliwa(f)}
                    className="px-3 py-2 rounded-xl text-[12px] font-medium transition-all"
                    style={typPaliwa === f
                      ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.18)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.32)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {f}
                  </button>
                ))}
              </div>

              <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Objawy</label>
              <textarea placeholder="np. stuka na zimnym silniku, grzechocze przy 2000 obr…" value={symptoms} onChange={e => setSymptoms(e.target.value)}
                className="w-full text-[14px] text-white/88 rounded-xl p-4 h-24 outline-none resize-none placeholder:text-white/28 mb-5 input-glow"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />

              {!pendingAction ? (
                <button onClick={() => setShowContextSheet(false)}
                  className="w-full font-bold py-4 rounded-2xl text-[14px] active:scale-[0.99]"
                  style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,180,0.1))', border: '1px solid rgba(0,212,255,0.28)', color: 'rgba(255,255,255,0.9)' }}>
                  Gotowe
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => { setShowContextSheet(false); const a = pendingAction; setPendingAction(null); setTimeout(() => { if (a === 'record') startRecording(); else if (a === 'analyze') analyzeUploadedFile(); }, 100); }}
                    className="flex-[0.8] font-bold py-4 rounded-2xl text-[14px] active:scale-[0.99]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }}>Pomiń</button>
                  <button onClick={() => { setShowContextSheet(false); const a = pendingAction; setPendingAction(null); setTimeout(() => { if (a === 'record') startRecording(); else if (a === 'analyze') analyzeUploadedFile(); }, 100); }}
                    className="flex-[1.2] font-bold py-4 rounded-2xl text-[14px] active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,100,180,0.1))', border: '1px solid rgba(0,212,255,0.28)', color: 'rgba(255,255,255,0.9)' }}>
                    Gotowe i {pendingAction === 'record' ? 'Skanuj' : 'Analizuj'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CREDIT MODAL */}
      <AnimatePresence>
        {showCreditModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }} onClick={() => setShowCreditModal(false)} />
            <motion.div initial={{ scale: 0.88, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0, y: 24 }}
              transition={springBouncy} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[85%] max-w-sm rounded-3xl p-6 text-center"
              style={{ background: 'rgba(10,18,28,0.95)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(60px)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Zap className="w-7 h-7 text-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.6))' }} />
              </div>
              <h3 className="text-[22px] font-bold text-white mb-2">Brak Kredytów</h3>
              <p className="text-[14px] text-white/58 mb-6">Uzupełnij aby kontynuować diagnozy AI.</p>
              <button onClick={() => handleBuyCredits('5_credits')} disabled={isRedirectingToStripe}
                className="w-full font-bold py-3.5 rounded-2xl text-[13px] flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#f59e0b', color: '#000' }}>
                {isRedirectingToStripe ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> 5 Skanów — 29 PLN</>}
              </button>
              <button onClick={() => setShowCreditModal(false)} className="mt-4 text-[12px] text-white/35 hover:text-white/60 uppercase tracking-wider font-medium">Anuluj</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div initial={{ y: -36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -36, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', backdropFilter: 'blur(20px)' }}>
            <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.2)' }}>
              <Zap className="w-2.5 h-2.5 text-[#10b981]" />
            </div>
            <p className="text-[12px] font-semibold text-white/82">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
