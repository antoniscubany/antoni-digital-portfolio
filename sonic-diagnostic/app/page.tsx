'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import {
  motion, AnimatePresence,
  useAnimation, useMotionValue, useSpring, useTransform
} from 'framer-motion';
import Image from 'next/image';
import {
  Upload, FileText, X,
  Home, Clock, MessageCircle, Settings,
  RefreshCcw, AlertTriangle, Wrench, FileAudio,
  ChevronRight, Globe, User, HelpCircle, Zap,
  Send
} from 'lucide-react';
import {
  analyzeMedia, getUserDiagnosisHistory,
  getUserCredits, addPurchasedCredits, askMechanic
} from './actions';
import { useUser } from '@clerk/nextjs';

/* ─── Spring configs ─── */
const springBouncy = { type: 'spring' as const, stiffness: 320, damping: 22 };
const springSmooth = { type: 'spring' as const, stiffness: 200, damping: 26 };

/* ─── Types ─── */
type TabId = 'home' | 'history' | 'chat' | 'settings';
type ScannerState = 'idle' | 'recording' | 'fileReady' | 'processing';
type ChatMsg = { role: 'user' | 'model'; content: string };

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════ */
export default function SonicDiagnostic() {

  /* ── UI state ── */
  const [showSplash, setShowSplash]             = useState(true);
  const [activeTab, setActiveTab]               = useState<TabId>('home');
  const [scannerState, setScannerState]         = useState<ScannerState>('idle');
  const [showContextSheet, setShowContextSheet] = useState(false);
  const [showResults, setShowResults]           = useState(false);

  /* ── User / credits ── */
  const { isLoaded, isSignedIn, user } = useUser();
  const [diagnosisHistory, setDiagnosisHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  /* ── Context ── */
  const [category, setCategory] = useState('Auto');
  const [makeModel, setMakeModel] = useState('');
  const [symptoms, setSymptoms]   = useState('');

  /* ── Recording / File ── */
  const [result, setResult]             = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [countdown, setCountdown]       = useState(12);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const fileInputRef     = useRef<HTMLInputElement>(null);
  const countdownRef     = useRef<NodeJS.Timeout | null>(null);

  /* ── Splash animation ── */
  const [splashAnimated, setSplashAnimated]       = useState(false);
  const [splashFading, setSplashFading]           = useState(false);
  const [soundPlayed, setSoundPlayed]             = useState(false);
  const [showDiagnosticText, setShowDiagnosticText] = useState(false);
  const [typedText, setTypedText]                 = useState('');
  const splashAudioCtxRef = useRef<AudioContext | null>(null);
  const bgControls       = useAnimation();
  const chevronControls  = useAnimation();
  const dotControls      = useAnimation();
  const textControls     = useAnimation();
  const whiteCircleControls = useAnimation();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxSpring = { damping: 30, stiffness: 100 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), parallaxSpring);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), parallaxSpring);
  const sharpPath  = 'M 30 60 L 50 25 L 50 25 L 70 60 L 58 60 L 50 46 L 50 46 L 42 60 Z';
  const squarePath = 'M 30 60 L 49.2 26.4 L 50.8 26.4 L 70 60 L 58 60 L 50.8 47.4 L 49.2 47.4 L 42 60 Z';

  /* ── Chat (fully functional) ── */
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]       = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef   = useRef<HTMLDivElement>(null);
  const chatInitRef  = useRef(false);

  /* ────────────────────────────────────
     SPLASH HANDLERS
  ──────────────────────────────────── */
  const handleSplashMouseMove = (e: React.MouseEvent) => {
    if (!splashAnimated) return;
    mouseX.set(e.clientX / window.innerWidth  - 0.5);
    mouseY.set(e.clientY / window.innerHeight - 0.5);
  };

  useEffect(() => {
    if (!showDiagnosticText) return;
    let i = 0;
    const text = 'SONIC DIAGNOSTIC';
    const interval = setInterval(() => {
      setTypedText(text.slice(0, i + 1));
      if (splashAudioCtxRef.current) {
        const ctx = splashAudioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(4000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.015);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.02);
      }
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 45);
    return () => clearInterval(interval);
  }, [showDiagnosticText]);

  const playSplashSound = () => {
    if (soundPlayed) return;
    setSoundPlayed(true);
    if (!splashAudioCtxRef.current) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      splashAudioCtxRef.current = new AC();
    }
    const ctx = splashAudioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine'; subOsc.frequency.setValueAtTime(55, t);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(0.3, t + 0.8);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    subOsc.connect(subGain); subGain.connect(ctx.destination);
    subOsc.start(t); subOsc.stop(t + 3.5);
    [440.0, 554.37, 659.25, 830.61, 987.77].forEach((freq, idx) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.setValueAtTime(freq, t);
      const gain = ctx.createGain(); gain.gain.setValueAtTime(0, t);
      const at = t + 0.1 + idx * 0.08;
      gain.gain.linearRampToValueAtTime(0.04, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 2.5);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 3.5);
    });
    const pt = t + 0.9;
    const pingOsc = ctx.createOscillator(); pingOsc.type = 'sine'; pingOsc.frequency.setValueAtTime(1760, pt);
    const pingGain = ctx.createGain(); pingGain.gain.setValueAtTime(0, pt);
    pingGain.gain.linearRampToValueAtTime(0.15, pt + 0.01);
    pingGain.gain.exponentialRampToValueAtTime(0.001, pt + 1.5);
    pingOsc.connect(pingGain); pingGain.connect(ctx.destination);
    pingOsc.start(pt); pingOsc.stop(pt + 1.5);
  };

  /* ────────────────────────────────────
     DATA FETCHING
  ──────────────────────────────────── */
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

  /* ────────────────────────────────────
     STRIPE
  ──────────────────────────────────── */
  const handleBuyCredits = async (packageId: '5_credits' | '15_credits') => {
    try {
      setIsRedirectingToStripe(true);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      alert('Wystąpił błąd płatności. Spróbuj ponownie.');
      setIsRedirectingToStripe(false);
    }
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

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 5000);
    return () => clearTimeout(t);
  }, [toastMessage]);

  /* ────────────────────────────────────
     SPLASH EFFECT
  ──────────────────────────────────── */
  useEffect(() => {
    const runSplash = async () => {
      setSplashAnimated(true);
      playSplashSound();
      textControls.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } });
      whiteCircleControls.start({ scale: 0, transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] } });
      bgControls.start({ backgroundColor: '#0B1117', transition: { duration: 1.5, ease: [0.4, 0, 0.2, 1] } });
      chevronControls.start({
        d: squarePath, y: 0, scale: 1, fill: '#00C2FF',
        filter: 'drop-shadow(0px 0px 25px rgba(0, 194, 255, 0.8))',
        transition: { duration: 1.2, ease: [0.34, 1.56, 0.64, 1] },
      });
      await dotControls.start({
        y: [-40, 0], scale: [0, 1.3, 1], opacity: [0, 1, 1], rx: [4, 4, 3.2],
        filter: [
          'drop-shadow(0px 0px 0px rgba(255,255,255,0))',
          'drop-shadow(0px 0px 40px rgba(255,255,255,1))',
          'drop-shadow(0px 0px 15px rgba(255,255,255,0.8))',
        ],
        transition: { delay: 0.9, duration: 0.8, times: [0, 0.6, 1], ease: 'easeOut' },
      });
      setTimeout(() => setShowDiagnosticText(true), 150);
      chevronControls.start({ y: [0, -6, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } });
      dotControls.start({ y: [0, -3, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } });
      setTimeout(() => setSplashFading(true), 3800);
      setTimeout(() => setShowSplash(false), 4600);
    };
    runSplash();
    const unlock = () => {
      if (splashAudioCtxRef.current) splashAudioCtxRef.current.resume().then(playSplashSound);
      else playSplashSound();
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('mousedown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
    return () => {
      window.removeEventListener('mousedown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ────────────────────────────────────
     RECORDING
  ──────────────────────────────────── */
  const startRecording = useCallback(async () => {
    if (credits !== null && credits < 1) { setShowCreditModal(true); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      setCountdown(12);

      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const fd = new FormData();
        fd.append('file', blob, 'recording.webm');
        fd.append('category', category); fd.append('makeModel', makeModel); fd.append('symptoms', symptoms);
        setScannerState('processing');
        const diag = await analyzeMedia(fd);
        if (diag?.error === 'OUT_OF_CREDITS') { setShowCreditModal(true); setScannerState('idle'); return; }
        setResult(diag);
        setScannerState('idle');
        setShowResults(true);
        if (diag?.chat_opener) {
          setChatMessages([{ role: 'model', content: diag.chat_opener }]);
          chatInitRef.current = true;
        }
        fetchUserData();
      };

      mr.start();
      setScannerState('recording');
      let sec = 12;
      countdownRef.current = setInterval(() => {
        sec--; setCountdown(sec);
        if (sec <= 0 && countdownRef.current) clearInterval(countdownRef.current);
      }, 1000);
      setTimeout(() => {
        if (mr.state !== 'inactive') { mr.stop(); stream.getTracks().forEach(t => t.stop()); setScannerState('processing'); }
        if (countdownRef.current) clearInterval(countdownRef.current);
      }, 12000);
    } catch { alert('Błąd mikrofonu. Sprawdź uprawnienia.'); }
  }, [category, makeModel, symptoms, credits, fetchUserData]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    setScannerState('idle');
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file); setScannerState('fileReady');
  };

  const analyzeUploadedFile = async () => {
    if (!uploadedFile) return;
    if (credits !== null && credits < 1) { setShowCreditModal(true); return; }
    const fd = new FormData();
    fd.append('file', uploadedFile); fd.append('category', category);
    fd.append('makeModel', makeModel); fd.append('symptoms', symptoms);
    setScannerState('processing');
    const diag = await analyzeMedia(fd);
    if (diag?.error === 'OUT_OF_CREDITS') { setShowCreditModal(true); setScannerState('idle'); setUploadedFile(null); return; }
    setResult(diag); setScannerState('idle'); setUploadedFile(null); setShowResults(true);
    if (diag?.chat_opener) { setChatMessages([{ role: 'model', content: diag.chat_opener }]); chatInitRef.current = true; }
    fetchUserData();
  };

  const resetScan = () => {
    setShowResults(false); setResult(null); setUploadedFile(null); setScannerState('idle');
    fetchUserData();
  };

  /* ────────────────────────────────────
     CHAT
  ──────────────────────────────────── */
  const activeContext = result
    ? `Maszyna: ${category} ${makeModel}. Objawy: ${symptoms}. Diagnoza: ${result.diagnosis_title} (${result.severity}, pewność ${result.confidence_score}%). Wyjaśnienie: ${result.human_explanation}`
    : undefined;

  /* Init greeting when chat tab is first opened */
  useEffect(() => {
    if (activeTab === 'chat' && !chatInitRef.current) {
      chatInitRef.current = true;
      setChatMessages([{
        role: 'model',
        content: result
          ? (result.chat_opener || `Przeanalizowałem Twoją maszynę. Wykryto: **${result.diagnosis_title}**. Masz pytania?`)
          : 'Cześć! Jestem Twoim AI mechanikiem. Nagraj dźwięk maszyny lub zadaj pytanie — postaram się pomóc.',
      }]);
    }
  }, [activeTab, result]);

  /* Auto-scroll */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;
    setChatInput('');
    const updated: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(updated);
    setIsChatLoading(true);
    try {
      const res = await askMechanic(updated, activeContext);
      setChatMessages(prev => [...prev, {
        role: 'model',
        content: res.error ? res.error : (res.content ?? '…'),
      }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Przepraszam, wystąpił błąd połączenia.' }]);
    } finally { setIsChatLoading(false); }
  }, [chatInput, chatMessages, isChatLoading, activeContext]);

  const isListening = scannerState === 'recording' || scannerState === 'processing';

  /* ════════════════════════════════════════════════════════════
     SPLASH SCREEN
     ════════════════════════════════════════════════════════════ */
  if (showSplash) {
    return (
      <motion.div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-50 bg-[#0B1117]"
        initial={{ opacity: 1 }}
        animate={{ opacity: splashFading ? 0 : 1 }}
        transition={{ opacity: { duration: 0.8, ease: 'easeInOut' } }}
        onMouseMove={handleSplashMouseMove}
      >
        <motion.div
          className="absolute rounded-full bg-[#E0F7FF] pointer-events-none"
          initial={{ scale: 30, width: '100vmax', height: '100vmax', filter: 'blur(8px)' }}
          animate={whiteCircleControls}
          style={{ transformOrigin: 'center center', boxShadow: '0 0 100px 40px rgba(59,130,246,0.3)', top: '50%', left: '50%', x: '-50%', y: 'calc(-50% + 22px)' }}
        />
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }} animate={{ opacity: splashAnimated ? 1 : 0 }} transition={{ duration: 2 }}
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,194,255,0.04) 0%, transparent 60%)' }}
        />
        <div style={{ perspective: 1200 }} className="relative z-10 flex flex-col items-center">
          <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-64 h-64 md:w-80 md:h-80 overflow-visible">
              <motion.path
                initial={{ d: sharpPath, y: 20, scale: 0.95, fill: '#4285F4', filter: 'drop-shadow(0px 0px 0px rgba(0,194,255,0))' }}
                animate={chevronControls}
                strokeLinejoin="round" strokeLinecap="round"
                style={{ transformOrigin: '50% 50%' }}
              />
              <motion.rect x="46" y="68" width="8" height="8" fill="#FFFFFF"
                initial={{ opacity: 0, scale: 0, y: -20, rx: 4 }}
                animate={dotControls}
                style={{ transformOrigin: '50% 72px' }}
              />
            </svg>
          </motion.div>
          <div className="absolute -bottom-8 md:-bottom-12 h-6 flex items-center justify-center pointer-events-none">
            <span className="font-sans text-[10px] md:text-xs font-semibold tracking-[0.4em] text-[#8A9BA8] uppercase">
              {typedText}
              {showDiagnosticText && typedText.length < 'SONIC DIAGNOSTIC'.length && (
                <motion.span
                  className="inline-block w-1.5 h-3 bg-[#8A9BA8] ml-1 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }}
                />
              )}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     RECORDING / PROCESSING FULLSCREEN
     ════════════════════════════════════════════════════════════ */
  if (isListening) {
    return (
      <div className="fixed inset-0 overflow-hidden flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="app-container relative w-full h-full flex flex-col items-center justify-center">

          {/* Close button */}
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            onClick={stopRecording}
            className="absolute top-12 left-5 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <X className="w-4 h-4 text-white/60" />
          </motion.button>

          {/* Rings */}
          <div className="relative flex items-center justify-center">
            {scannerState === 'recording' && (
              <>
                {[0, 0.7, 1.4].map((delay, i) => (
                  <motion.div
                    key={`pulse-${i}`}
                    className="absolute rounded-full"
                    style={{ width: 200, height: 200, border: '1px solid rgba(0,212,255,0.15)' }}
                    initial={{ scale: 1, opacity: 0.5 }}
                    animate={{ scale: 3.8 + i * 0.35, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 3.2, delay, ease: 'easeOut' }}
                  />
                ))}
              </>
            )}

            <motion.div className="absolute rounded-full shazam-ring ring-recording-5" animate={scannerState === 'recording' ? { scale: [1, 1.015, 1] } : {}} transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }} />
            <motion.div className="absolute rounded-full shazam-ring ring-recording-4" animate={scannerState === 'recording' ? { scale: [1, 1.02, 1] } : {}}  transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.2 }} />
            <motion.div className="absolute rounded-full shazam-ring ring-recording-3" animate={scannerState === 'recording' ? { scale: [1, 1.03, 1] } : {}}  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut', delay: 0.4 }} />
            <motion.div className="absolute rounded-full shazam-ring ring-recording-2" animate={scannerState === 'recording' ? { scale: [1, 1.04, 1] } : {}}  transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', delay: 0.3 }} />
            <motion.div className="absolute rounded-full shazam-ring ring-recording-1" animate={scannerState === 'recording' ? { scale: [1, 1.05, 1] } : {}}  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', delay: 0.1 }} />

            {/* Center circle */}
            <motion.div
              className="relative z-10 w-[164px] h-[164px] rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle at 38% 32%, rgba(0,80,140,0.9), rgba(6,13,20,0.98))',
                boxShadow: scannerState === 'recording'
                  ? '0 0 0 1px rgba(0,212,255,0.2), 0 0 60px rgba(0,212,255,0.18), inset 0 1px 0 rgba(255,255,255,0.08)'
                  : '0 0 0 1px rgba(255,255,255,0.07), 0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
              animate={scannerState === 'processing' ? { scale: [1, 0.94, 1] } : { scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {scannerState === 'processing' ? (
                <motion.div
                  className="w-9 h-9 rounded-full border-t-[#00d4ff]"
                  style={{ border: '2px solid rgba(0,212,255,0.15)', borderTopColor: '#00d4ff' }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                />
              ) : (
                <Image src="/logo.png" alt="Sonic" width={76} height={76} className="opacity-90" />
              )}
            </motion.div>
          </div>

          {/* Equalizer */}
          <motion.div className="flex items-end gap-[4px] mt-14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            {[0, 0.12, 0.24, 0.36, 0.48].map((d, i) => (
              <div key={i} className="eq-bar eq-bar-cyan" style={{ animationDelay: `${d}s`, height: '20px' }} />
            ))}
          </motion.div>

          {/* Text */}
          <motion.div className="text-center mt-7" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, ...springSmooth }}>
            <h2 className="text-[22px] font-bold text-white tracking-tight leading-none mb-2">
              {scannerState === 'processing' ? 'Analiza AI…' : 'Nasłuchiwanie'}
            </h2>
            <p className="text-sm text-white/28 max-w-[240px] mx-auto leading-relaxed">
              {scannerState === 'processing'
                ? 'Gemini przetwarza nagranie'
                : 'Zbliż mikrofon do źródła dźwięku'}
            </p>
            {scannerState === 'recording' && (
              <motion.div
                className="mt-5 flex items-center justify-center gap-2"
                key={countdown}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18 }}
              >
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

  /* ════════════════════════════════════════════════════════════
     MAIN APP SHELL
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 overflow-hidden flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(0,50,100,0.35), var(--background) 65%)' }}>
      <div className="app-container">

        {/* ── TOP HEADER ── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3" style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 14px)' }}>
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Sonic" width={26} height={26} className="opacity-75" />
            <div className="flex items-baseline gap-1">
              <span className="text-[15px] font-bold text-white/85 tracking-tight">Sonic</span>
              <span className="text-[15px] font-light text-white/28">Diagnostic</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SignedIn>
              {credits !== null && (
                <motion.button
                  onClick={() => setShowCreditModal(true)}
                  whileTap={{ scale: 0.94 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all"
                  style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.22)' }}
                >
                  <Zap className="w-3 h-3 text-[#f59e0b]" />
                  <span className="text-[11px] text-[#f59e0b] font-bold tabular-nums">{credits}</span>
                </motion.button>
              )}
              <UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-4 py-1.5 rounded-full text-xs font-medium text-white/60 transition-colors hover:text-white/80"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  Zaloguj
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">

            {/* ══════════ HOME ══════════ */}
            {activeTab === 'home' && !showResults && (
              <motion.div
                key="home"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0 flex flex-col"
              >
                {/* Scan centerpiece */}
                <div className="flex-1 flex flex-col items-center justify-center px-5">

                  {/* Ring system + button */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute rounded-full shazam-ring ring-idle-3" />
                    <div className="absolute rounded-full shazam-ring ring-idle-2" />
                    <div className="absolute rounded-full shazam-ring ring-idle-1" />

                    <motion.button
                      onClick={scannerState === 'idle' ? startRecording : scannerState === 'fileReady' ? analyzeUploadedFile : undefined}
                      className="relative z-10 w-[176px] h-[176px] rounded-full flex flex-col items-center justify-center"
                      style={{
                        background: scannerState === 'fileReady'
                          ? 'radial-gradient(circle at 38% 32%, rgba(0,80,60,0.9), rgba(6,13,20,0.97))'
                          : 'radial-gradient(circle at 38% 32%, rgba(10,30,55,0.95), rgba(6,13,20,0.98))',
                        boxShadow: scannerState === 'fileReady'
                          ? '0 0 0 1px rgba(16,185,129,0.3), 0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
                          : '0 0 0 1px rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
                      }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.95 }}
                      transition={springBouncy}
                    >
                      {scannerState === 'fileReady' ? (
                        <div className="flex flex-col items-center gap-2">
                          <Zap className="w-10 h-10 text-[#10b981]" style={{ filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.5))' }} />
                          <span className="text-[10px] text-[#10b981] font-bold tracking-[0.2em] uppercase">Analizuj</span>
                        </div>
                      ) : (
                        <Image src="/logo.png" alt="Sonic" width={78} height={78} className="opacity-85" />
                      )}
                    </motion.button>
                  </div>

                  {/* Hint label */}
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="text-[13px] text-white/28 font-medium tracking-wide mt-6 mb-5"
                  >
                    {scannerState === 'fileReady' ? 'Plik gotowy — dotknij aby analizować' : 'Dotknij aby nagrać dźwięk'}
                  </motion.p>

                  {/* Action pills */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                    className="flex gap-2.5"
                  >
                    <input type="file" accept="video/*,audio/*,image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <Upload className="w-3.5 h-3.5 text-white/35" />
                      <span className="text-[12px] text-white/45 font-medium">Upload</span>
                    </motion.button>
                    <motion.button
                      onClick={() => setShowContextSheet(true)}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <FileText className="w-3.5 h-3.5 text-[#f59e0b]/55" />
                      <span className="text-[12px] text-white/45 font-medium">Kontekst</span>
                      {(makeModel || symptoms) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 4px rgba(245,158,11,0.8))' }} />
                      )}
                    </motion.button>
                  </motion.div>

                  {/* Uploaded file chip */}
                  <AnimatePresence>
                    {uploadedFile && (
                      <motion.div
                        initial={{ opacity: 0, y: 5, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                        className="mt-3.5 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
                        style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}
                      >
                        <FileAudio className="w-3.5 h-3.5 text-[#10b981]" />
                        <span className="text-[11px] text-white/55 truncate max-w-[170px]">{uploadedFile.name}</span>
                        <button onClick={() => { setUploadedFile(null); setScannerState('idle'); }} className="ml-auto shrink-0">
                          <X className="w-3 h-3 text-white/20 hover:text-white/50 transition-colors" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Recent scan card */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
                  className="shrink-0 px-5 pb-4"
                >
                  <p className="text-[9px] text-white/18 font-semibold uppercase tracking-[0.14em] mb-2.5">Ostatni Skan</p>
                  {diagnosisHistory.length > 0 ? (
                    <motion.button
                      onClick={() => setActiveTab('history')}
                      whileTap={{ scale: 0.99 }}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                        ${diagnosisHistory[0].severity === 'CRITICAL' ? 'bg-red-500/10' : diagnosisHistory[0].severity === 'SAFE' ? 'bg-[#10b981]/10' : 'bg-[#f59e0b]/10'}`}>
                        <FileAudio className={`w-4 h-4 ${diagnosisHistory[0].severity === 'CRITICAL' ? 'text-red-400' : diagnosisHistory[0].severity === 'SAFE' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/75 truncate">{diagnosisHistory[0].diagnosisTitle}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {new Date(diagnosisHistory[0].createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} · {diagnosisHistory[0].confidenceScore}% pewności
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-white/18 shrink-0" />
                    </motion.button>
                  ) : (
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl opacity-35" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                        <FileAudio className="w-4 h-4 text-white/20" />
                      </div>
                      <p className="text-[12px] text-white/30">
                        {isSignedIn ? 'Naciśnij logo aby nagrać' : 'Zaloguj się aby zapisywać'}
                      </p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {/* ══════════ RESULTS ══════════ */}
            {activeTab === 'home' && showResults && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={springSmooth}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-5 pt-3 pb-6 space-y-3">
                  {result.error ? (
                    <div className="rounded-2xl p-8 text-center mt-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <AlertTriangle className="w-9 h-9 text-red-400 mx-auto mb-3" />
                      <p className="text-sm text-red-300/80">{result.error}</p>
                      <button onClick={resetScan} className="mt-4 text-[11px] text-white/30 hover:text-white/60 flex items-center gap-1.5 mx-auto transition-colors">
                        <RefreshCcw className="w-3 h-3" /> Spróbuj ponownie
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <h2 className="text-[15px] font-bold text-white/75 tracking-tight">Wynik Diagnostyki</h2>
                        <button onClick={resetScan} className="flex items-center gap-1 text-[10px] text-white/22 hover:text-white/45 font-medium uppercase tracking-wider transition-colors">
                          <RefreshCcw className="w-3 h-3" /> Nowy
                        </button>
                      </div>

                      {/* Main diagnosis card */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, ...springSmooth }}
                        className="rounded-2xl p-5"
                        style={{
                          background: result.severity === 'CRITICAL'
                            ? 'linear-gradient(145deg, rgba(239,68,68,0.09), rgba(6,13,20,0.95))'
                            : result.severity === 'SAFE'
                            ? 'linear-gradient(145deg, rgba(16,185,129,0.09), rgba(6,13,20,0.95))'
                            : 'linear-gradient(145deg, rgba(245,158,11,0.09), rgba(6,13,20,0.95))',
                          border: `1px solid ${result.severity === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : result.severity === 'SAFE' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        }}
                      >
                        <div className="flex items-center justify-between mb-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase
                            ${result.severity === 'CRITICAL' ? 'bg-red-500/12 text-red-400' : result.severity === 'SAFE' ? 'bg-[#10b981]/12 text-[#10b981]' : 'bg-[#f59e0b]/12 text-[#f59e0b]'}`}>
                            {result.severity}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                            <span className="text-[11px] text-white/38 font-medium tabular-nums">{result.confidence_score}% pewności</span>
                          </div>
                        </div>
                        <h3 className="text-[20px] font-bold text-white leading-tight mb-2.5">
                          {result.diagnosis_title || result.diagnosis}
                        </h3>
                        <p className="text-[13px] text-white/50 leading-relaxed">{result.human_explanation}</p>
                      </motion.div>

                      {/* Grid: analysis + cost */}
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { label: 'Analiza Dźwięku', content: result.reasoning, delay: 0.08 },
                          {
                            label: 'Szacowany Koszt',
                            content: result.cost_and_action?.match(/[\d,.]+\s*(?:PLN|zł)/i)?.[0] || '—',
                            sub: 'netto, szacunkowo',
                            large: true,
                            delay: 0.12,
                          },
                        ].map(({ label, content, sub, large, delay }) => (
                          <motion.div
                            key={label}
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ...springSmooth }}
                            className="rounded-2xl p-4"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            <p className="text-[9px] text-white/22 uppercase tracking-wider mb-2 font-semibold">{label}</p>
                            {large ? (
                              <>
                                <p className="text-[17px] font-bold text-white/85">{content}</p>
                                {sub && <p className="text-[9px] text-white/20 mt-1">{sub}</p>}
                              </>
                            ) : (
                              <p className="text-[12px] text-white/55 leading-relaxed line-clamp-5">{content}</p>
                            )}
                          </motion.div>
                        ))}
                      </div>

                      {/* Recommendation */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, ...springSmooth }}
                        className="rounded-2xl p-4"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <p className="text-[9px] text-[#f59e0b]/55 uppercase font-semibold mb-2.5 flex items-center gap-1.5 tracking-wider">
                          <Wrench className="w-3 h-3" /> Plan Działania
                        </p>
                        <p className="text-[13px] text-white/50 leading-relaxed">{result.cost_and_action || result.action_plan}</p>
                      </motion.div>

                      {/* Chat CTA */}
                      <motion.button
                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ...springSmooth }}
                        onClick={() => setActiveTab('chat')}
                        whileTap={{ scale: 0.98 }}
                        className="w-full rounded-2xl p-4 flex items-center gap-3.5 transition-all"
                        style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.07), rgba(6,13,20,0.9))', border: '1px solid rgba(0,212,255,0.14)' }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.1)' }}>
                          <MessageCircle className="w-4.5 h-4.5 text-[#00d4ff]" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[13px] font-semibold text-white/80">Zapytaj AI Mechanika</p>
                          <p className="text-[11px] text-white/32 mt-0.5">Zadaj pytanie o diagnozę</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#00d4ff]/35 shrink-0" />
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════ HISTORY ══════════ */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={springSmooth}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-5 pt-2 pb-8">
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[20px] font-bold text-white/88">Historia Diagnoz</h2>
                    {isFetchingHistory && <RefreshCcw className="w-4 h-4 text-white/22 animate-spin" />}
                  </div>

                  {!isSignedIn ? (
                    <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <FileAudio className="w-6 h-6 text-white/18" />
                      </div>
                      <p className="text-[13px] text-white/38 mb-5 leading-relaxed">Zaloguj się, aby przeglądać historię diagnoz</p>
                      <SignInButton mode="modal">
                        <button className="px-6 py-2.5 rounded-full text-[13px] font-medium text-white/65 transition-all hover:text-white/80"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          Zaloguj się
                        </button>
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
                        <motion.div
                          key={item.id || i}
                          initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.28), ...springSmooth }}
                          className="rounded-2xl p-4"
                          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                              ${item.severity === 'CRITICAL' ? 'bg-red-500/10' : item.severity === 'SAFE' ? 'bg-[#10b981]/10' : 'bg-[#f59e0b]/10'}`}>
                              <FileAudio className={`w-4.5 h-4.5 ${item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'SAFE' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[13px] font-semibold text-white/78 leading-tight">{item.diagnosisTitle}</p>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 tabular-nums
                                  ${item.severity === 'CRITICAL' ? 'bg-red-500/12 text-red-400' : item.severity === 'SAFE' ? 'bg-[#10b981]/12 text-[#10b981]' : 'bg-[#f59e0b]/12 text-[#f59e0b]'}`}>
                                  {item.confidenceScore}%
                                </span>
                              </div>
                              <p className="text-[10px] text-white/28 mt-1">
                                {new Date(item.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                {' · '}{item.machineCategory}{item.makeModel ? ` (${item.makeModel})` : ''}
                              </p>
                            </div>
                          </div>
                          {item.actionPlan && (
                            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                              <p className="text-[12px] text-white/38 line-clamp-2 leading-relaxed">{item.actionPlan}</p>
                              {item.repairCost && (
                                <p className="text-[10px] text-[#f59e0b]/55 mt-1.5 font-medium">{item.repairCost}</p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                      <p className="text-center text-[9px] text-white/10 uppercase tracking-[0.16em] mt-3">Koniec historii</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════ CHAT ══════════ */}
            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col"
              >
                {/* Chat header */}
                <div className="shrink-0 flex items-center gap-3 px-5 pt-2 pb-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: 'radial-gradient(circle at 40% 35%, rgba(0,212,255,0.18), rgba(6,13,20,0.9))', border: '1px solid rgba(0,212,255,0.18)' }}>
                    <Wrench className="w-4 h-4 text-[#00d4ff]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/82 leading-none mb-0.5">AI Mechanik</p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" style={{ filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.8))' }} />
                      <span className="text-[10px] text-[#10b981]/80 font-medium">Online</span>
                      {result && (
                        <>
                          <span className="text-white/15 mx-0.5">·</span>
                          <span className="text-[10px] text-white/28 truncate max-w-[140px]">{result.diagnosis_title}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
                  {chatMessages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <MessageCircle className="w-6 h-6 text-white/12" />
                        </div>
                        <p className="text-[13px] text-white/25">Zadaj pytanie mechanikowi</p>
                      </div>
                    </div>
                  )}

                  <AnimatePresence initial={false}>
                    {chatMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                      >
                        {msg.role === 'model' && (
                          <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-0.5"
                            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.15)' }}>
                            <Wrench className="w-3 h-3 text-[#00d4ff]" />
                          </div>
                        )}
                        <div
                          className={`max-w-[78%] px-4 py-3 text-[13px] leading-relaxed ${
                            msg.role === 'user'
                              ? 'rounded-2xl rounded-br-[6px] text-white'
                              : 'rounded-2xl rounded-bl-[6px] text-white/72'
                          }`}
                          style={msg.role === 'user'
                            ? { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }
                            : { background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }
                          }
                        >
                          {msg.content}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isChatLoading && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-end gap-2"
                      >
                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.15)' }}>
                          <Wrench className="w-3 h-3 text-[#00d4ff]" />
                        </div>
                        <div className="px-4 py-3 rounded-2xl rounded-bl-[6px] flex items-center gap-1.5"
                          style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          {[0, 0.18, 0.36].map((delay) => (
                            <motion.div
                              key={delay}
                              className="w-1.5 h-1.5 rounded-full bg-white/35"
                              animate={{ scale: [1, 1.6, 1], opacity: [0.35, 0.9, 0.35] }}
                              transition={{ repeat: Infinity, duration: 1.1, delay, ease: 'easeInOut' }}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={chatEndRef} />
                </div>

                {/* Input bar */}
                <div className="shrink-0 px-4 pb-3 pt-2">
                  <div className="flex items-center gap-2.5 px-3 py-2 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                      placeholder="Napisz wiadomość…"
                      disabled={isChatLoading}
                      className="flex-1 bg-transparent text-[13px] text-white/78 outline-none placeholder:text-white/20 disabled:opacity-50 py-1"
                    />
                    <motion.button
                      onClick={sendChatMessage}
                      disabled={!chatInput.trim() || isChatLoading}
                      whileTap={{ scale: 0.88 }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-25"
                      style={{ background: chatInput.trim() && !isChatLoading ? 'rgba(0,212,255,0.16)' : 'rgba(255,255,255,0.05)' }}
                    >
                      <Send className={`w-3.5 h-3.5 ${chatInput.trim() && !isChatLoading ? 'text-[#00d4ff]' : 'text-white/28'}`} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════ SETTINGS ══════════ */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={springSmooth}
                className="absolute inset-0 overflow-y-auto"
              >
                <div className="px-5 pt-2 pb-10 space-y-5">
                  <h2 className="text-[20px] font-bold text-white/88">Ustawienia</h2>

                  {/* Credits / upgrade */}
                  <div className="rounded-2xl p-5 relative overflow-hidden"
                    style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.09), rgba(6,13,20,0.96))', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'rgba(245,158,11,0.12)', filter: 'blur(24px)' }} />
                    <div className="flex items-start justify-between mb-4 relative">
                      <div>
                        <h3 className="text-[15px] font-bold text-white/88 flex items-center gap-2 mb-1">
                          <Zap className="w-4 h-4 text-[#f59e0b]" /> Pakiety Skanów
                        </h3>
                        <p className="text-[11px] text-white/38 leading-relaxed max-w-[200px]">Kup kredyty i diagnozuj maszyny od ręki</p>
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
                        <div>
                          <p className="text-[13px] font-semibold text-white/78">5 Skanów</p>
                          <p className="text-[10px] text-white/32 mt-0.5">Podstawowa Diagnoza</p>
                        </div>
                        <button
                          onClick={() => handleBuyCredits('5_credits')}
                          disabled={isRedirectingToStripe}
                          className="px-4 py-2 rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50"
                          style={{ background: '#f59e0b', color: '#000' }}
                        >
                          29 PLN
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-xl relative overflow-hidden" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.24)' }}>
                        <div className="absolute top-2 right-2 bg-[#f59e0b] text-black text-[8px] font-bold px-1.5 py-0.5 rounded-[3px] uppercase">BEST</div>
                        <div>
                          <p className="text-[13px] font-semibold text-white/88">15 Skanów PRO</p>
                          <p className="text-[10px] text-white/38 mt-0.5">Dla mechaników · taniej</p>
                        </div>
                        <button
                          onClick={() => handleBuyCredits('15_credits')}
                          disabled={isRedirectingToStripe}
                          className="px-4 py-2 rounded-lg text-[12px] font-bold transition-colors disabled:opacity-50 mt-3"
                          style={{ background: '#f59e0b', color: '#000' }}
                        >
                          69 PLN
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Settings list */}
                  <div>
                    <p className="text-[9px] text-white/18 font-semibold uppercase tracking-[0.14em] mb-3">Preferencje</p>
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      {/* Language */}
                      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)' }}>
                            <Globe className="w-4 h-4 text-[#00d4ff]/55" />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-white/72">Język</p>
                            <p className="text-[10px] text-white/28">Interfejs i diagnoza</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white/70" style={{ background: 'rgba(255,255,255,0.1)' }}>PL</span>
                          <span className="px-2.5 py-1 rounded-lg text-[11px] text-white/22">EN</span>
                        </div>
                      </div>
                      {/* Account */}
                      <div className="flex items-center justify-between px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>
                            <User className="w-4 h-4 text-[#f59e0b]/55" />
                          </div>
                          <div>
                            <p className="text-[13px] font-medium text-white/72">Konto</p>
                            <p className="text-[10px] text-white/28">Zarządzaj profilem</p>
                          </div>
                        </div>
                        <SignedIn>
                          <UserButton appearance={{ elements: { avatarBox: 'w-7 h-7' } }} />
                        </SignedIn>
                        <SignedOut>
                          <SignInButton mode="modal">
                            <button className="text-[12px] text-[#00d4ff]/65 hover:text-[#00d4ff] transition-colors">Zaloguj</button>
                          </SignInButton>
                        </SignedOut>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center justify-between px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <HelpCircle className="w-4 h-4 text-white/28" />
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-white/72">Wsparcie</p>
                          <p className="text-[10px] text-white/28">FAQ & Kontakt</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/14" />
                    </div>
                  </div>

                  <div className="text-center pt-3 space-y-1">
                    <p className="text-[9px] text-white/12 uppercase tracking-[0.16em]">Sonic Diagnostic v5.0</p>
                    <p className="text-[9px] text-white/8">Powered by Gemini AI</p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── BOTTOM NAVIGATION ── */}
        <div className="shrink-0 px-4 pb-3 pt-1" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}>
          <motion.nav
            initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18, ...springBouncy }}
            className="flex items-center px-2 py-1.5 rounded-[26px]"
            style={{ background: 'rgba(12,20,30,0.7)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(60px)', WebkitBackdropFilter: 'blur(60px)' }}
          >
            {([
              { id: 'home'     as TabId, icon: Home,          label: 'Skaner' },
              { id: 'history'  as TabId, icon: Clock,         label: 'Historia' },
              { id: 'chat'     as TabId, icon: MessageCircle, label: 'Czat' },
              { id: 'settings' as TabId, icon: Settings,      label: 'Więcej' },
            ]).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (tab.id !== 'home') setShowResults(false); }}
                  whileTap={{ scale: 0.92 }}
                  className="relative flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[20px] transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-bg"
                      className="absolute inset-0 rounded-[20px]"
                      style={{ background: 'rgba(255,255,255,0.09)' }}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <tab.icon
                    className={`w-[18px] h-[18px] relative z-10 transition-all duration-200 ${isActive ? 'text-white' : 'text-white/22'}`}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' } : {}}
                  />
                  <span className={`text-[9px] font-medium relative z-10 transition-colors duration-200 ${isActive ? 'text-white/75' : 'text-white/18'}`}>
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </motion.nav>
        </div>
      </div>

      {/* ════════════════════════════════════════
          CONTEXT BOTTOM SHEET
          ════════════════════════════════════════ */}
      <AnimatePresence>
        {showContextSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
              onClick={() => setShowContextSheet(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ ...springBouncy, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] px-5 flex flex-col max-h-[85dvh] overflow-y-auto"
              style={{ background: 'rgba(10,18,28,0.92)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(60px)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
            >
              <div className="w-8 h-1 rounded-full mx-auto mt-3 mb-5 shrink-0" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <h3 className="text-[17px] font-bold text-white/88 mb-5 shrink-0">Kontekst Maszyny</h3>

              <label className="text-[9px] text-white/25 uppercase tracking-[0.14em] mb-2 block font-semibold">Kategoria</label>
              <div className="flex gap-2 mb-5">
                {['Auto', 'AGD', 'Przemysł', 'Inne'].map((cat) => (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all"
                    style={category === cat
                      ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.18)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.32)', border: '1px solid rgba(255,255,255,0.06)' }
                    }>
                    {cat}
                  </button>
                ))}
              </div>

              <label className="text-[9px] text-white/25 uppercase tracking-[0.14em] mb-2 block font-semibold">Marka / Model</label>
              <input
                type="text"
                placeholder="np. BMW E46 / Bosch WAN28…"
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                className="w-full text-[13px] text-white/78 mb-5 rounded-xl p-3.5 outline-none transition-colors placeholder:text-white/18"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              />

              <label className="text-[9px] text-white/25 uppercase tracking-[0.14em] mb-2 block font-semibold">Objawy</label>
              <textarea
                placeholder="np. stuka na zimnym silniku, grzechocze przy 2000 obr…"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full text-[13px] text-white/78 rounded-xl p-3.5 h-24 outline-none resize-none transition-colors placeholder:text-white/18 mb-5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              />

              <button
                onClick={() => setShowContextSheet(false)}
                className="w-full font-semibold py-3.5 rounded-2xl text-[13px] transition-all active:scale-[0.99]"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
              >
                Zapisz kontekst
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          CREDIT MODAL
          ════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreditModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(16px)' }}
              onClick={() => setShowCreditModal(false)}
            />
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 24 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.88, opacity: 0, y: 24 }}
              transition={springBouncy}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[85%] max-w-sm rounded-3xl p-6 text-center"
              style={{ background: 'rgba(10,18,28,0.95)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(60px)' }}
            >
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Zap className="w-7 h-7 text-[#f59e0b]" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.6))' }} />
              </div>
              <h3 className="text-[20px] font-bold text-white mb-2">Brak Kredytów</h3>
              <p className="text-[13px] text-white/38 mb-6 leading-relaxed px-2">
                Zapas skanów się wyczerpał.<br />Uzupełnij aby kontynuować diagnozy AI.
              </p>
              <button
                onClick={() => handleBuyCredits('5_credits')}
                disabled={isRedirectingToStripe}
                className="w-full font-bold py-3.5 rounded-2xl text-[13px] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#f59e0b', color: '#000' }}
              >
                {isRedirectingToStripe
                  ? <RefreshCcw className="w-4 h-4 animate-spin" />
                  : <><Zap className="w-4 h-4" /> 5 Skanów — 29 PLN</>
                }
              </button>
              <button onClick={() => setShowCreditModal(false)} className="mt-4 text-[11px] text-white/22 hover:text-white/45 transition-colors uppercase tracking-wider font-medium">
                Anuluj
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ y: -36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -36, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-full"
            style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)', backdropFilter: 'blur(20px)' }}
          >
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
