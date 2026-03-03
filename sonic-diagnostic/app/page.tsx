'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { motion, AnimatePresence, useAnimation, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import {
  Mic, Upload, FileText, X,
  Home, Clock, MessageCircle, Settings, Search,
  RefreshCcw, AlertTriangle, Wrench, FileAudio,
  ChevronDown, Globe, User, HelpCircle, Zap,
  Send, Volume2, VolumeX
} from 'lucide-react';
import { analyzeMedia, getUserDiagnosisHistory, getUserCredits, addPurchasedCredits } from './actions';
import { useUser } from '@clerk/nextjs';

/* ─────────────────────────── SPRING CONFIGS ─────────────────────────── */
const springBouncy = { type: 'spring' as const, stiffness: 300, damping: 20 };
const springSmooth = { type: 'spring' as const, stiffness: 200, damping: 25 };
const springGentle = { type: 'spring' as const, stiffness: 120, damping: 18 };

/* ─────────────────────────── TYPES ─────────────────────────── */
type TabId = 'home' | 'history' | 'chat' | 'settings';
type ScannerState = 'idle' | 'recording' | 'fileReady' | 'processing';

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */
export default function SonicDiagnostic() {
  // ── App state
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [showContextSheet, setShowContextSheet] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // ── User Data
  const { isLoaded, isSignedIn, user } = useUser();
  const [diagnosisHistory, setDiagnosisHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [isRedirectingToStripe, setIsRedirectingToStripe] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Context
  const [category, setCategory] = useState('Auto');
  const [makeModel, setMakeModel] = useState('');
  const [symptoms, setSymptoms] = useState('');

  // ── Recording & File
  const [result, setResult] = useState<any>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [countdown, setCountdown] = useState(12);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // ── Elegant Logo Animation (splash) state
  const [splashAnimated, setSplashAnimated] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [showDiagnosticText, setShowDiagnosticText] = useState(false);
  const [typedText, setTypedText] = useState('');
  const splashAudioCtxRef = useRef<AudioContext | null>(null);

  const bgControls = useAnimation();
  const chevronControls = useAnimation();
  const dotControls = useAnimation();
  const textControls = useAnimation();
  const whiteCircleControls = useAnimation();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxSpring = { damping: 30, stiffness: 100 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), parallaxSpring);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), parallaxSpring);

  const sharpPath = 'M 30 60 L 50 25 L 50 25 L 70 60 L 58 60 L 50 46 L 50 46 L 42 60 Z';
  const squarePath = 'M 30 60 L 49.2 26.4 L 50.8 26.4 L 70 60 L 58 60 L 50.8 47.4 L 49.2 47.4 L 42 60 Z';

  const handleSplashMouseMove = (e: React.MouseEvent) => {
    if (!splashAnimated) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX / innerWidth - 0.5);
    mouseY.set(clientY / innerHeight - 0.5);
  };

  // ── Typing effect for SONIC DIAGNOSTIC
  useEffect(() => {
    if (showDiagnosticText) {
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
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.02);
        }
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 45);
      return () => clearInterval(interval);
    }
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
    // Sub-bass swell
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, t);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(0.3, t + 0.8);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 3.5);
    // Glassy Chord (Amaj9)
    [440.0, 554.37, 659.25, 830.61, 987.77].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      const attackTime = t + 0.1 + index * 0.08;
      gain.gain.linearRampToValueAtTime(0.04, attackTime);
      gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 2.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 3.5);
    });
    // Ping when dot lands
    const pingTime = t + 0.9;
    const pingOsc = ctx.createOscillator();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(1760.0, pingTime);
    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0, pingTime);
    pingGain.gain.linearRampToValueAtTime(0.15, pingTime + 0.01);
    pingGain.gain.exponentialRampToValueAtTime(0.001, pingTime + 1.5);
    pingOsc.connect(pingGain);
    pingGain.connect(ctx.destination);
    pingOsc.start(pingTime);
    pingOsc.stop(pingTime + 1.5);
  };

  // ── Fetch History & Credits ──
  const fetchUserData = useCallback(async () => {
    if (!isSignedIn) {
      setDiagnosisHistory([]);
      setCredits(null);
      return;
    }
    setIsFetchingHistory(true);
    try {
      const [history, userCredits] = await Promise.all([
        getUserDiagnosisHistory(),
        getUserCredits()
      ]);
      setDiagnosisHistory(history || []);
      setCredits(userCredits);
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setIsFetchingHistory(false);
    }
  }, [isSignedIn]);

  // Fetch on mount or when auth state changes
  useEffect(() => {
    if (isLoaded) {
      fetchUserData();
    }
  }, [isLoaded, isSignedIn, fetchUserData]);

  // Checkout Handler
  const handleBuyCredits = async (packageId: '5_credits' | '15_credits') => {
    try {
      setIsRedirectingToStripe(true);
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId })
      });

      if (!res.ok) throw new Error("Checkout failed");

      const { url } = await res.json();
      window.location.href = url; // Redirect to Stripe
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd płatności. Spróbuj powonie.");
      setIsRedirectingToStripe(false);
    }
  };

  // Check URL for Stripe success
  useEffect(() => {
    if (typeof window !== 'undefined' && isSignedIn && user) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('success')) {
        // Fallback for local dev: Add credits immediately since Webhooks might be blocked
        addPurchasedCredits(user.id, 5).then(() => {
          setToastMessage("Płatność zrealizowana! Kredyty zasilone. ⚡");
          window.history.replaceState(null, '', window.location.pathname);
          // Refresh credits immediately
          fetchUserData();
        });
      }
    }
  }, [fetchUserData, isSignedIn, user]);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Auto-trigger splash animation on mount
  useEffect(() => {
    const runSplash = async () => {
      setSplashAnimated(true);
      playSplashSound();
      textControls.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } });

      // The white circle shrinks down to the dot, revealing the dark background
      whiteCircleControls.start({
        scale: 0,
        transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] }
      });

      bgControls.start({ backgroundColor: '#0B1117', transition: { duration: 1.5, ease: [0.4, 0, 0.2, 1] } });
      chevronControls.start({
        d: squarePath,
        y: 0,
        scale: 1,
        fill: '#00C2FF',
        filter: 'drop-shadow(0px 0px 25px rgba(0, 194, 255, 0.8))',
        transition: { duration: 1.2, ease: [0.34, 1.56, 0.64, 1] },
      });
      await dotControls.start({
        y: [-40, 0],
        scale: [0, 1.3, 1],
        opacity: [0, 1, 1],
        rx: [4, 4, 3.2],
        filter: [
          'drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))',
          'drop-shadow(0px 0px 40px rgba(255, 255, 255, 1))',
          'drop-shadow(0px 0px 15px rgba(255, 255, 255, 0.8))',
        ],
        transition: { delay: 0.9, duration: 0.8, times: [0, 0.6, 1], ease: 'easeOut' },
      });
      setTimeout(() => setShowDiagnosticText(true), 150);
      // Continuous floating
      chevronControls.start({ y: [0, -6, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } });
      dotControls.start({ y: [0, -3, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } });
      // Smooth fade-out then dismiss
      setTimeout(() => setSplashFading(true), 3800);
      setTimeout(() => setShowSplash(false), 4600);
    };
    runSplash();

    // Browser audio unlocker - plays sound on first interaction if blocked on mount
    const unlockAudio = () => {
      if (splashAudioCtxRef.current) {
        splashAudioCtxRef.current.resume().then(() => {
          playSplashSound();
        });
      } else {
        playSplashSound();
      }
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('mousedown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('mousedown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Recording logic (preserved from original)
  const startRecording = useCallback(async () => {

    if (credits !== null && credits < 1) {
      setShowCreditModal(true);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setCountdown(12);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorderRef.current?.mimeType || 'audio/webm',
        });
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('category', category);
        formData.append('makeModel', makeModel);
        formData.append('symptoms', symptoms);

        setScannerState('processing');
        const diagnosis = await analyzeMedia(formData);

        if (diagnosis?.error === 'OUT_OF_CREDITS') {
          setShowCreditModal(true);
          setScannerState('idle');
          return;
        }

        setResult(diagnosis);
        setScannerState('idle');
        setShowResults(true);
      };

      mediaRecorder.start();
      setScannerState('recording');

      // Countdown
      let sec = 12;
      countdownRef.current = setInterval(() => {
        sec--;
        setCountdown(sec);
        if (sec <= 0 && countdownRef.current) clearInterval(countdownRef.current);
      }, 1000);

      // 12-second auto-stop
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
          setScannerState('processing');
        }
        if (countdownRef.current) clearInterval(countdownRef.current);
      }, 12000);
    } catch {
      alert('Błąd mikrofonu. Sprawdź uprawnienia.');
    }
  }, [category, makeModel, symptoms]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    setScannerState('idle');
  }, []);

  // ── File upload handler (preserved logic)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setScannerState('fileReady');
  };

  // ── Analyze uploaded file
  const analyzeUploadedFile = async () => {
    if (!uploadedFile) return;

    if (credits !== null && credits < 1) {
      setShowCreditModal(true);
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('category', category);
    formData.append('makeModel', makeModel);
    formData.append('symptoms', symptoms);

    setScannerState('processing');
    const diagnosis = await analyzeMedia(formData);

    if (diagnosis?.error === 'OUT_OF_CREDITS') {
      setShowCreditModal(true);
      setScannerState('idle');
      setUploadedFile(null);
      return;
    }

    setResult(diagnosis);
    setScannerState('idle');
    setUploadedFile(null);
    setShowResults(true);
  };

  // ── Reset
  const resetScan = () => {
    setShowResults(false);
    setResult(null);
    setUploadedFile(null);
    setScannerState('idle');
    // Refresh history just in case they saved a new scan and burned a credit
    fetchUserData();
  };

  const isListening = scannerState === 'recording' || scannerState === 'processing';

  /* ═══════════════════════════════════════════════════════════
     SPLASH SCREEN — Elegant Logo Animation
     ═══════════════════════════════════════════════════════════ */
  if (showSplash) {
    return (
      <motion.div
        className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-50 bg-[#0B1117]"
        initial={{ opacity: 1 }}
        animate={{ opacity: splashFading ? 0 : 1 }}
        transition={{ opacity: { duration: 0.8, ease: 'easeInOut' } }}
        onMouseMove={handleSplashMouseMove}
      >
        {/* The expanding/shrinking circle that acts as the initial soft background */}
        <motion.div
          className="absolute rounded-full bg-[#E0F7FF] pointer-events-none"
          initial={{
            scale: 30,
            width: '100vmax',
            height: '100vmax',
            filter: 'blur(8px)'
          }}
          animate={whiteCircleControls}
          style={{
            transformOrigin: 'center center',
            boxShadow: '0 0 100px 40px rgba(59, 130, 246, 0.3)',
            top: '50%',
            left: '50%',
            x: '-50%',
            y: 'calc(-50% + 22px)'
          }}
        />

        {/* Radial glow */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: splashAnimated ? 1 : 0 }}
          transition={{ duration: 2 }}
          style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0, 194, 255, 0.03) 0%, transparent 60%)' }}
        />



        {/* 3D Perspective wrapper */}
        <div style={{ perspective: 1200 }} className="relative z-10 flex flex-col items-center">
          <motion.div
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            className="relative flex items-center justify-center"
          >
            <svg viewBox="0 0 100 100" className="w-64 h-64 md:w-80 md:h-80 overflow-visible">
              {/* Chevron */}
              <motion.path
                initial={{
                  d: sharpPath,
                  y: 20,
                  scale: 0.95,
                  fill: '#4285F4',
                  filter: 'drop-shadow(0px 0px 0px rgba(0, 194, 255, 0))',
                }}
                animate={chevronControls}
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ transformOrigin: '50% 50%' }}
              />
              {/* Dot */}
              <motion.rect
                x="46" y="68" width="8" height="8"
                fill="#FFFFFF"
                initial={{ opacity: 0, scale: 0, y: -20, rx: 4 }}
                animate={dotControls}
                style={{ transformOrigin: '50% 72px' }}
              />
            </svg>
          </motion.div>

          {/* Typed text */}
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

  /* ═══════════════════════════════════════════════════════════
     RECORDING / LISTENING FULLSCREEN — Shazam style
     ═══════════════════════════════════════════════════════════ */
  if (isListening) {
    return (
      <div className="fixed inset-0 bg-[#061018] text-white overflow-hidden flex items-center justify-center">
        <div className="app-container relative w-full h-full flex flex-col items-center justify-center">
          {/* X close button — top left */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={stopRecording}
            className="absolute top-12 left-6 z-20 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </motion.button>

          {/* ── Concentric rings ── */}
          <div className="relative flex items-center justify-center">
            {/* Outermost expanding pulse rings */}
            {scannerState === 'recording' && (
              <>
                {[0, 0.6, 1.2].map((delay, i) => (
                  <motion.div
                    key={`pulse-${i}`}
                    className="absolute rounded-full border border-white/5"
                    style={{ width: 200, height: 200 }}
                    initial={{ scale: 1, opacity: 0.3 }}
                    animate={{ scale: 3.5 + i * 0.3, opacity: 0 }}
                    transition={{
                      repeat: Infinity,
                      duration: 3,
                      delay,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </>
            )}

            {/* Static concentric rings (Shazam gray gradient) */}
            <motion.div
              className="absolute rounded-full shazam-ring ring-recording-5"
              animate={scannerState === 'recording' ? { scale: [1, 1.02, 1] } : {}}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute rounded-full shazam-ring ring-recording-4"
              animate={scannerState === 'recording' ? { scale: [1, 1.03, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 0.2 }}
            />
            <motion.div
              className="absolute rounded-full shazam-ring ring-recording-3"
              animate={scannerState === 'recording' ? { scale: [1, 1.04, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut', delay: 0.4 }}
            />
            <motion.div
              className="absolute rounded-full shazam-ring ring-recording-2"
              animate={scannerState === 'recording' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut', delay: 0.3 }}
            />
            <motion.div
              className="absolute rounded-full shazam-ring ring-recording-1"
              animate={scannerState === 'recording' ? { scale: [1, 1.06, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', delay: 0.1 }}
            />

            {/* ── Center circle with logo ── */}
            <motion.div
              className="relative z-10 w-[160px] h-[160px] rounded-full bg-[#1a2a38] flex items-center justify-center border border-white/10"
              animate={scannerState === 'processing' ? { scale: [1, 0.95, 1] } : { scale: [1, 1.03, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              {scannerState === 'processing' ? (
                <motion.div
                  className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              ) : (
                <Image
                  src="/logo.png"
                  alt="Sonic"
                  width={80}
                  height={80}
                  className="opacity-90"
                />
              )}
            </motion.div>
          </div>

          {/* ── Equalizer dots ── */}
          <motion.div
            className="flex items-end gap-[6px] mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="eq-bar" />
            <div className="eq-bar" />
            <div className="eq-bar" />
          </motion.div>

          {/* ── Text ── */}
          <motion.div
            className="text-center mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, ...springSmooth }}
          >
            <h2 className="text-xl font-bold text-white mb-2">
              {scannerState === 'processing' ? 'Analiza AI...' : 'Nasłuchiwanie'}
            </h2>
            <p className="text-sm text-white/40 max-w-[280px] mx-auto">
              {scannerState === 'processing'
                ? 'Przetwarzanie nagrania. Proszę czekać.'
                : 'Upewnij się, że urządzenie słyszy dźwięk wyraźnie'}
            </p>
            {scannerState === 'recording' && (
              <motion.p
                className="text-2xl font-bold text-white/80 mt-4 tabular-nums"
                key={countdown}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {countdown}s
              </motion.p>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN APP SHELL — Shazam style
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 bg-[#061018] text-white overflow-hidden flex flex-col items-center">
      {/* ── Subtle ambient background glow ── */}
      <div className="fixed top-[-40%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#0a2540]/30 blur-[200px] rounded-full pointer-events-none" />

      {/* ── APP CONTAINER (responsive) ── */}
      <div className="app-container flex-1 overflow-y-auto overflow-x-hidden pb-24 relative w-full">
        <AnimatePresence mode="wait">
          {/* ════════════════ HOME TAB ════════════════ */}
          {activeTab === 'home' && !showResults && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center min-h-full px-6 pt-14 relative"
            >
              {/* ── Settings gear top-right ── */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => setActiveTab('settings')}
                className="absolute top-14 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <Settings className="w-5 h-5 text-white/40" />
              </motion.button>

              {/* ── "Tap to Scan" heading ── */}
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, ...springSmooth }}
                className="text-xl font-bold text-white mt-16 mb-12"
              >
                Dotknij aby Skanować
              </motion.h1>

              {/* ── Clerk Auth UI ── */}
              <div className='mt-4 flex flex-col items-center justify-center gap-2 z-50 relative'>
                <SignedOut>
                  <SignInButton mode='modal'>
                    <button className='bg-white/10 hover:bg-white/20 text-white border border-white/20 px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all backdrop-blur-md'>
                      Zaloguj jako inżynier
                    </button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <div className='flex items-center gap-3 bg-black/50 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md'>
                    <span className='text-xs text-cyan-400 font-bold uppercase tracking-widest'>System Online</span>
                    <UserButton afterSignOutUrl='/' />
                  </div>
                  {credits !== null && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 shadow-inner backdrop-blur-md">
                      <Zap className="w-3 h-3 text-[#f59e0b]" />
                      <span className="text-[10px] text-white/70 font-bold tracking-wider">{credits} KREDYTÓW</span>
                    </div>
                  )}
                </SignedIn>
              </div>

              {/* ── CENTERPIECE: Shazam-style ring button ── */}
              <div className="relative flex items-center justify-center my-4">
                {/* Outer rings (idle state) */}
                <div className="absolute rounded-full shazam-ring ring-idle-3" />
                <div className="absolute rounded-full shazam-ring ring-idle-2" />
                <div className="absolute rounded-full shazam-ring ring-idle-1" />

                {/* THE BUTTON */}
                <motion.button
                  onClick={
                    scannerState === 'idle'
                      ? startRecording
                      : scannerState === 'fileReady'
                        ? analyzeUploadedFile
                        : undefined
                  }
                  className={`relative z-10 w-[180px] h-[180px] rounded-full flex flex-col items-center justify-center transition-all duration-300
                    ${scannerState === 'fileReady'
                      ? 'bg-[#10b981]/15 border-2 border-[#10b981]/40'
                      : 'bg-[#1a2a38] border-2 border-white/8 hover:border-white/15'
                    }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={springBouncy}
                >
                  {scannerState === 'fileReady' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Zap className="w-10 h-10 text-[#10b981]" />
                      <span className="text-[11px] text-[#10b981] font-bold tracking-[0.15em] uppercase">
                        Analizuj
                      </span>
                    </div>
                  ) : (
                    <Image
                      src="/logo.png"
                      alt="Sonic"
                      width={80}
                      height={80}
                      className="opacity-80"
                    />
                  )}
                </motion.button>
              </div>

              {/* ── Action pills below ── */}
              {(scannerState === 'idle' || scannerState === 'fileReady') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, ...springSmooth }}
                  className="flex gap-3 mt-10"
                >
                  <input
                    type="file"
                    accept="video/*,audio/*,image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-surface rounded-full px-5 py-3 flex items-center gap-2 hover:bg-white/8 transition-all active:scale-95"
                  >
                    <Upload className="w-4 h-4 text-white/50" />
                    <span className="text-xs text-white/60 font-medium">Upload</span>
                  </button>

                  <button
                    onClick={() => setShowContextSheet(true)}
                    className="glass-surface rounded-full px-5 py-3 flex items-center gap-2 hover:bg-white/8 transition-all active:scale-95"
                  >
                    <FileText className="w-4 h-4 text-[#f59e0b]/70" />
                    <span className="text-xs text-white/60 font-medium">Kontekst</span>
                  </button>
                </motion.div>
              )}

              {/* Uploaded file indicator */}
              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 glass-surface rounded-xl px-4 py-2 flex items-center gap-2"
                >
                  <FileAudio className="w-4 h-4 text-[#10b981]" />
                  <span className="text-xs text-white/60 truncate max-w-[200px]">{uploadedFile.name}</span>
                  <button onClick={() => { setUploadedFile(null); setScannerState('idle'); }} className="ml-1">
                    <X className="w-3 h-3 text-white/30 hover:text-white/60" />
                  </button>
                </motion.div>
              )}

              {/* ── Recently Found / Recent Context  ── */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, ...springSmooth }}
                className="w-full mt-auto pt-12"
              >
                {(category !== 'Auto' || makeModel || symptoms) && (
                  <div className="mb-6">
                    <p className="text-xs text-white/30 font-semibold mb-3">Aktywny kontekst</p>
                    <div className="glass-surface rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-[#f59e0b]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/80">{category}</p>
                        <p className="text-[10px] text-white/30">
                          {makeModel || 'Brak modelu'}{symptoms ? ' • Objawy ✓' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-white/30 font-semibold mb-3">Ostatnie Skany</p>
                {diagnosisHistory.length > 0 ? (
                  <div className="glass-surface rounded-2xl p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setActiveTab('history')}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center 
                        ${diagnosisHistory[0].severity === 'CRITICAL' ? 'bg-red-500/10' :
                          diagnosisHistory[0].severity === 'SAFE' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                        <FileAudio className={`w-6 h-6 
                          ${diagnosisHistory[0].severity === 'CRITICAL' ? 'text-red-400' :
                            diagnosisHistory[0].severity === 'SAFE' ? 'text-green-400' : 'text-amber-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/80 font-semibold truncate">{diagnosisHistory[0].diagnosisTitle}</p>
                        <p className="text-[10px] text-white/40">
                          {new Date(diagnosisHistory[0].createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} • {diagnosisHistory[0].confidenceScore}% pewności
                        </p>
                      </div>
                    </div>
                    {/* Shows count badge if multiple scans */}
                    {diagnosisHistory.length > 1 && (
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50">
                        +{diagnosisHistory.length - 1}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-surface rounded-2xl p-4 flex items-center gap-3 opacity-50">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                      <FileAudio className="w-6 h-6 text-white/30" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/40">Brak zapisanych skanów</p>
                      {isSignedIn ? (
                        <p className="text-[10px] text-white/20">Dotknij Skanuj aby nagrać</p>
                      ) : (
                        <p className="text-[10px] text-[#00C2FF]/70">Zaloguj się aby zapisywać</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ════════════════ RESULTS VIEW ════════════════ */}
          {activeTab === 'home' && showResults && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={springSmooth}
              className="px-5 pt-14 pb-8 space-y-4"
            >
              {result.error ? (
                <div className="glass-surface rounded-2xl p-8 text-center">
                  <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                  <p className="text-red-300 text-sm">{result.error}</p>
                  <button
                    onClick={resetScan}
                    className="mt-4 text-xs text-white/40 hover:text-white/70 flex items-center gap-1 mx-auto"
                  >
                    <RefreshCcw className="w-3 h-3" /> Spróbuj ponownie
                  </button>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, ...springSmooth }}
                    className="flex items-center justify-between mb-2"
                  >
                    <h2 className="text-lg font-bold text-white/90">Wynik Diagnostyki</h2>
                    <button onClick={resetScan} className="text-white/30 hover:text-white/60 transition-colors">
                      <RefreshCcw className="w-4 h-4" />
                    </button>
                  </motion.div>

                  {/* ── Main diagnosis card ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15, ...springSmooth }}
                    className="glass-surface-strong rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase
                        ${result.severity === 'CRITICAL'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                            : result.severity === 'SAFE'
                              ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                          }`}
                      >
                        {result.severity}
                      </span>
                      <span className="text-white/50 text-xs font-semibold">
                        {result.confidence_score}% pewności
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white leading-tight mb-2">
                      {result.diagnosis_title || result.diagnosis}
                    </h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      {result.human_explanation}
                    </p>
                  </motion.div>

                  {/* ── 2-column grid ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25, ...springSmooth }}
                      className="glass-surface rounded-2xl p-4"
                    >
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <FileAudio className="w-3 h-3" /> Analiza
                      </p>
                      <p className="text-xs text-white/70 leading-relaxed line-clamp-4">
                        {result.reasoning}
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, ...springSmooth }}
                      className="glass-surface rounded-2xl p-4"
                    >
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">
                        Koszt
                      </p>
                      <p className="text-base font-bold text-white/80">
                        {result.cost_and_action?.match(/[\d,.]+\s*(?:PLN|zł)/i)?.[0] || '—'}
                      </p>
                      <p className="text-[10px] text-white/20 mt-1">szacunkowo</p>
                    </motion.div>
                  </div>

                  {/* ── Recommendation ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, ...springSmooth }}
                    className="glass-surface rounded-2xl p-5"
                  >
                    <p className="text-[10px] text-[#f59e0b]/70 uppercase font-semibold mb-2 flex items-center gap-2 tracking-wider">
                      <Wrench className="w-3.5 h-3.5" /> Rekomendacja
                    </p>
                    <p className="text-sm text-white/60 leading-relaxed">
                      {result.cost_and_action || result.action_plan}
                    </p>
                  </motion.div>

                  {/* ── Inline Chat Section ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, ...springSmooth }}
                    className="glass-surface rounded-2xl overflow-hidden mt-2"
                  >
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                      <span className="text-xs font-semibold text-white/70">AI Mechanik Online</span>
                    </div>
                    <div className="p-4 space-y-3 max-h-40 overflow-y-auto">
                      <div className="bg-white/5 border border-white/5 text-white/70 p-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%] leading-relaxed">
                        {result.chat_opener || 'Słyszę ten problem. W czym mogę pomóc?'}
                      </div>
                    </div>
                    <div className="p-3 border-t border-white/5 flex gap-2">
                      <input
                        type="text"
                        placeholder="Zapytaj mechanika..."
                        className="flex-1 bg-white/5 text-sm text-white/70 p-2.5 rounded-xl border border-white/5 outline-none focus:border-white/15 transition-colors placeholder:text-white/20"
                      />
                      <button className="bg-white/10 text-white/60 px-4 rounded-xl hover:bg-white/15 transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>

                  {/* ── New Scan ── */}
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={resetScan}
                    className="w-full flex items-center justify-center gap-2 py-4 text-white/25 hover:text-white/50 text-xs tracking-widest uppercase transition-colors mt-2"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" /> Nowy Skan
                  </motion.button>
                </>
              )}
            </motion.div>
          )}

          {/* ════════════════ HISTORY TAB ════════════════ */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springSmooth}
              className="px-6 pt-14"
            >
              <h2 className="text-xl font-bold text-white/90 mb-6 flex items-center gap-3">
                Historia Diagnoz
                {isFetchingHistory && <RefreshCcw className="w-4 h-4 text-white/30 animate-spin" />}
              </h2>

              <div className="space-y-3">
                {!isSignedIn ? (
                  <div className="glass-surface rounded-2xl p-8 flex justify-center text-center">
                    <div className="space-y-4">
                      <FileAudio className="w-12 h-12 text-white/20 mx-auto" />
                      <p className="text-sm text-white/50">Zaloguj się, aby zapisywać i przeglądać historię swoich diagnoz.</p>
                      <SignInButton mode="modal">
                        <button className="bg-white/10 text-white border border-white/20 px-6 py-2.5 rounded-full text-xs font-bold uppercase hover:bg-white/20 transition-all">
                          Zaloguj się
                        </button>
                      </SignInButton>
                    </div>
                  </div>
                ) : isFetchingHistory && diagnosisHistory.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <RefreshCcw className="w-6 h-6 text-white/20 animate-spin" />
                  </div>
                ) : diagnosisHistory.length === 0 ? (
                  <div className="glass-surface rounded-2xl p-8 text-center opacity-60">
                    <p className="text-sm text-white/50 mb-1">Twoja historia jest pusta.</p>
                    <p className="text-xs text-white/30">Wszystkie nowe, zapisane skany pojawią się tutaj.</p>
                  </div>
                ) : (
                  diagnosisHistory.map((item, i) => (
                    <motion.div
                      key={item.id || i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.4), ...springSmooth }}
                      className="glass-surface rounded-2xl p-4 flex flex-col gap-3 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                          ${item.severity === 'CRITICAL' ? 'bg-red-500/10' : item.severity === 'SAFE' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}
                          >
                            <FileAudio className={`w-5 h-5 ${item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'SAFE' ? 'text-green-400' : 'text-amber-400'}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white/80 line-clamp-1">{item.diagnosisTitle}</p>
                            <p className="text-[10px] text-white/40 mt-0.5">
                              {new Date(item.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {' '}• {item.machineCategory} {item.makeModel ? `(${item.makeModel})` : ''}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md shrink-0 ml-3
                          ${item.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : item.severity === 'SAFE' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {item.confidenceScore}%
                        </span>
                      </div>

                      {/* Expanded View Preview (Always visible in this card design for readiblity) */}
                      <div className="mt-2 bg-black/20 p-3 rounded-xl border border-white/5">
                        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">{item.actionPlan}</p>
                        {item.repairCost && (
                          <p className="text-[10px] text-[#f59e0b]/80 mt-2 font-medium">Koszt: {item.repairCost}</p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-white/15 uppercase tracking-widest">Koniec historii</p>
              </div>
            </motion.div>
          )}

          {/* ════════════════ CHAT TAB ════════════════ */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springSmooth}
              className="px-6 pt-14 flex flex-col h-[calc(100dvh-100px)]"
            >
              <h2 className="text-xl font-bold text-white/90 mb-6">AI Mechanik</h2>

              <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                {/* AI Message */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, ...springSmooth }}
                  className="flex gap-3 items-start max-w-[85%]"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Wrench className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl rounded-tl-sm">
                    <p className="text-sm text-white/60 leading-relaxed">
                      Cześć! Jestem Twoim AI mechanikiem. Zrób skan dźwięku, a pomogę Ci zdiagnozować problem. 🔧
                    </p>
                  </div>
                </motion.div>

                {/* User message mock */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, ...springSmooth }}
                  className="flex justify-end"
                >
                  <div className="bg-white/8 border border-white/5 p-3.5 rounded-2xl rounded-tr-sm max-w-[75%]">
                    <p className="text-sm text-white/70 leading-relaxed">
                      Silnik stuka na zimnym — co to może być?
                    </p>
                  </div>
                </motion.div>

                {/* AI response */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, ...springSmooth }}
                  className="flex gap-3 items-start max-w-[85%]"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Wrench className="w-4 h-4 text-white/60" />
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl rounded-tl-sm">
                    <p className="text-sm text-white/60 leading-relaxed">
                      Stukanie na zimnym silniku to najczęściej hydrauliki zaworów lub popychacze. Nagraj dźwięk przez zakładkę &quot;Skaner&quot;, to zdiagnozuję precyzyjnie! 🎯
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Chat input */}
              <div className="glass-surface rounded-2xl p-3 flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Napisz wiadomość..."
                  className="flex-1 bg-transparent text-sm text-white/70 p-2 outline-none placeholder:text-white/20"
                />
                <button className="bg-white/10 text-white/60 px-4 rounded-xl hover:bg-white/15 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ════════════════ SETTINGS TAB ════════════════ */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springSmooth}
              className="px-6 pt-14 pb-8"
            >
              <h2 className="text-xl font-bold text-white/90 mb-8">Ustawienia</h2>

              <div className="space-y-3">
                {/* Language */}
                <div className="glass-surface rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">Język</p>
                      <p className="text-[10px] text-white/30">Polski / English</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-white/70 text-xs font-bold">PL</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white/30 text-xs font-medium">EN</span>
                  </div>
                </div>

                {/* Credits / Upgrade Block */}
                <div className="glass-surface-strong rounded-2xl p-6 relative overflow-hidden mt-6 mb-2 border border-[#f59e0b]/20">
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#f59e0b]/20 blur-2xl rounded-full pointer-events-none" />

                  <h3 className="text-lg font-bold text-white/90 mb-1 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#f59e0b]" />
                    Pakiety Skanów
                  </h3>
                  <p className="text-xs text-white/50 mb-5 leading-relaxed">
                    Twój wirtualny warsztat potrzebuje zasilenia. Kup pakiety kredytów i rozwiązuj problemy z maszyną od ręki.
                  </p>

                  <div className="space-y-3">
                    {/* Package 1 */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-white/80">Pakiet X5 Skanów</p>
                        <p className="text-[10px] text-white/40 mt-1">Podstawowa Diagnoza</p>
                      </div>
                      <button
                        onClick={() => handleBuyCredits('5_credits')}
                        disabled={isRedirectingToStripe}
                        className="bg-[#f59e0b] hover:bg-[#d97706] text-black px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
                      >
                        29 PLN
                      </button>
                    </div>

                    {/* Package 2 */}
                    <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <div className="flex gap-2 items-center">
                          <p className="text-sm font-bold text-white/90">PRO X15 Skanów</p>
                          <span className="bg-[#f59e0b] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] uppercase">Best</span>
                        </div>
                        <p className="text-[10px] text-white/50 mt-1">Dla mechaników (taniej)</p>
                      </div>
                      <button
                        onClick={() => handleBuyCredits('15_credits')}
                        disabled={isRedirectingToStripe}
                        className="bg-[#f59e0b] hover:bg-[#d97706] text-black px-4 py-2 rounded-lg text-xs font-bold uppercase transition-colors"
                      >
                        69 PLN
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Settings */}
                <h3 className="text-sm font-bold text-white/90 mt-8 mb-4">Ustawienia</h3>
                <div className="glass-surface rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                      <User className="w-5 h-5 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">Konto</p>
                      <p className="text-[10px] text-white/30">Zarządzaj profilem</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/20 -rotate-90" />
                </div>

                {/* Support */}
                <div className="glass-surface rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">Wsparcie</p>
                      <p className="text-[10px] text-white/30">FAQ & Kontakt</p>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-white/20 -rotate-90" />
                </div>
              </div>

              <div className="mt-12 text-center space-y-1">
                <p className="text-[10px] text-white/15 uppercase tracking-widest">Sonic Diagnostic v5.0</p>
                <p className="text-[9px] text-white/10">Powered by Gemini 3.1 Pro</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════
         CONTEXT BOTTOM SHEET
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showContextSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowContextSheet(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={springBouncy}
              className="fixed bottom-0 left-0 right-0 z-50 glass-surface-strong rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-6" />

              <h3 className="text-lg font-bold text-white/90 mb-6">Dodaj Kontekst</h3>

              {/* Category */}
              <label className="text-[10px] text-white/30 uppercase tracking-widest mb-2 block">
                Kategoria
              </label>
              <div className="flex gap-2 mb-5">
                {['Auto', 'AGD', 'Przemysł', 'Inne'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all
                      ${category === cat
                        ? 'bg-white/10 text-white/80 border border-white/20'
                        : 'bg-white/5 border border-white/5 text-white/40 hover:bg-white/8'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Make & Model */}
              <label className="text-[10px] text-white/30 uppercase tracking-widest mb-2 block">
                Marka / Model
              </label>
              <input
                type="text"
                placeholder="np. BMW E46 / Bosch WAN28..."
                value={makeModel}
                onChange={(e) => setMakeModel(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white/80 mb-5 focus:border-white/15 outline-none transition-colors placeholder:text-white/15"
              />

              {/* Symptoms */}
              <label className="text-[10px] text-white/30 uppercase tracking-widest mb-2 block">
                Objawy
              </label>
              <textarea
                placeholder="np. stuka na zimnym silniku, grzechocze przy 2000 obr..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white/80 h-28 focus:border-white/15 outline-none resize-none transition-colors placeholder:text-white/15"
              />

              {/* Save button */}
              <button
                onClick={() => setShowContextSheet(false)}
                className="w-full mt-6 bg-white/10 border border-white/15 text-white/80 font-semibold py-3.5 rounded-2xl hover:bg-white/15 transition-all active:scale-[0.98]"
              >
                Zapisz Kontekst
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
         BOTTOM NAVIGATION BAR — Shazam style
         ═══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-30 safe-bottom flex justify-center pb-2">
        <motion.nav
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, ...springBouncy }}
          className="glass-surface-strong rounded-[28px] px-2 py-2 flex items-center gap-0 mx-4 max-w-[420px] w-full"
        >
          {([
            { id: 'home' as TabId, icon: Home, label: 'Skaner' },
            { id: 'history' as TabId, icon: Clock, label: 'Historia' },
            { id: 'chat' as TabId, icon: MessageCircle, label: 'Czat' },
            { id: 'settings' as TabId, icon: Search, label: 'Szukaj' },
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'home') {
                    setShowResults(false);
                  }
                }}
                className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 rounded-[22px] transition-all duration-300
                  ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <tab.icon
                  className={`w-5 h-5 transition-colors duration-300
                    ${isActive ? 'text-white' : 'text-white/30'}`}
                />
                <span
                  className={`text-[9px] font-medium transition-colors duration-300
                    ${isActive ? 'text-white' : 'text-white/20'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.nav>
      </div>
      {/* ═══════════════════════════════════════════════════════════
         CREDIT MODAL
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showCreditModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
              onClick={() => setShowCreditModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={springBouncy}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-[90%] max-w-sm glass-surface-strong border border-red-500/20 rounded-3xl p-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <Zap className="w-8 h-8 text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 tracking-widest leading-none mt-4">ENERGY DEPLETED</h3>
              <p className="text-sm text-white/50 mb-8 mt-4 leading-relaxed px-2">
                Zapas Twoich darmowych skanów wyczerpał się.
                <br /><br />
                Odnów zasoby wirtualnego warsztatu, aby kontynuować diagnozy AI.
              </p>

              <button
                onClick={() => handleBuyCredits('5_credits')}
                disabled={isRedirectingToStripe}
                className="w-full bg-[#f59e0b] hover:bg-[#d97706] text-black font-bold py-4 rounded-2xl uppercase tracking-wider text-[11px] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-50"
              >
                {isRedirectingToStripe ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> RECHARGE: 5 SCANS FOR 29 PLN
                  </>
                )}
              </button>

              <button
                onClick={() => setShowCreditModal(false)}
                className="mt-6 text-[10px] font-bold uppercase text-white/30 hover:text-white/60 tracking-[0.2em] transition-colors"
              >
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
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] bg-[#10b981]/15 border border-[#10b981]/30 backdrop-blur-xl px-5 py-3 rounded-full flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.2)] w-max max-w-[90vw]"
          >
            <div className="w-6 h-6 rounded-full bg-[#10b981]/20 flex items-center justify-center shrink-0">
              <Zap className="w-3 h-3 text-[#10b981] fill-[#10b981]" />
            </div>
            <p className="text-xs font-bold text-white tracking-wide truncate">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}