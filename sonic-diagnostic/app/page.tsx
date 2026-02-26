'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import Image from 'next/image';
import {
  Mic, Upload, FileText, X,
  Home, Clock, MessageCircle, Settings,
  RefreshCcw, AlertTriangle, Wrench, FileAudio,
  ChevronDown, Globe, User, HelpCircle, Zap,
  Send
} from 'lucide-react';
import { analyzeMedia } from './actions';

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
  const [showChatBubble, setShowChatBubble] = useState(false);

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

  // ── Splash screen timer
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2800);
    return () => clearTimeout(t);
  }, []);

  // ── Recording logic (preserved from original)
  const startRecording = useCallback(async () => {
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
        setResult(diagnosis);
        setScannerState('idle');
        setShowResults(true);
        setTimeout(() => setShowChatBubble(true), 1200);
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
    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('category', category);
    formData.append('makeModel', makeModel);
    formData.append('symptoms', symptoms);

    setScannerState('processing');
    const diagnosis = await analyzeMedia(formData);
    setResult(diagnosis);
    setScannerState('idle');
    setUploadedFile(null);
    setShowResults(true);
    setTimeout(() => setShowChatBubble(true), 1200);
  };

  // ── Reset
  const resetScan = () => {
    setShowResults(false);
    setShowChatBubble(false);
    setResult(null);
    setUploadedFile(null);
    setScannerState('idle');
  };

  /* ═══════════════════════════════════════════════════════════
     SPLASH SCREEN
     ═══════════════════════════════════════════════════════════ */
  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#05050a] flex items-center justify-center z-50">
        {/* Ambient glow */}
        <div className="absolute w-[400px] h-[400px] bg-[#00d4ff]/8 blur-[120px] rounded-full" />

        <motion.div
          className="relative flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={springGentle}
        >
          {/* Logo container with the dot animation */}
          <div className="relative w-28 h-28 mb-6">
            <Image
              src="/logo.png"
              alt="Sonic Diagnostic"
              width={112}
              height={112}
              className="relative z-10"
              priority
            />
            {/* Animated "dot" — a white circle that separates and returns */}
            <motion.div
              className="absolute top-1/2 left-1/2 w-3 h-3 bg-white rounded-full z-20"
              style={{ marginLeft: '-6px', marginTop: '-6px' }}
              initial={{ x: 0, y: 0, opacity: 0 }}
              animate={{
                x: [0, 30, 25, 0],
                y: [0, -20, -15, 0],
                opacity: [0, 1, 1, 0.8, 0],
                scale: [0.5, 1.2, 1, 0.8],
              }}
              transition={{
                duration: 2.2,
                times: [0, 0.3, 0.6, 1],
                ease: [
                  [0.34, 1.56, 0.64, 1],
                  [0.25, 0.1, 0.25, 1],
                  [0.68, -0.55, 0.27, 1.55],
                ],
              }}
            />
          </div>

          <motion.p
            className="text-white/40 text-xs tracking-[0.3em] uppercase font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, ...springSmooth }}
          >
            Sonic Diagnostic
          </motion.p>

          {/* Fade out entire splash */}
          <motion.div
            className="fixed inset-0 bg-[#05050a] pointer-events-none z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.3, duration: 0.5 }}
          />
        </motion.div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     MAIN APP SHELL
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="fixed inset-0 bg-[#05050a] text-white overflow-hidden flex flex-col">
      {/* ── Ambient background glows ── */}
      <div className="fixed top-[-30%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00d4ff]/6 blur-[180px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#6366f1]/5 blur-[150px] rounded-full pointer-events-none" />

      {/* ── SCROLLABLE CONTENT AREA ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-24">
        <AnimatePresence mode="wait">
          {/* ────────── HOME TAB ────────── */}
          {activeTab === 'home' && !showResults && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springSmooth}
              className="flex flex-col items-center min-h-full px-6 pt-14"
            >
              {/* ── Top Alert Tooltip ── */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ...springSmooth }}
                className="glass-surface rounded-2xl px-5 py-3 mb-12 max-w-xs text-center"
              >
                <p className="text-[11px] text-white/50 leading-relaxed">
                  <span className="text-[#00d4ff] font-semibold">Tip:</span> For best results, record
                  <span className="text-white/70 font-medium"> 0.5m from the engine</span> &amp; add context.
                </p>
              </motion.div>

              {/* ── CENTERPIECE: The Mic Button ── */}
              <div className="relative flex items-center justify-center my-8">
                {/* Concentric ripples during recording */}
                {scannerState === 'recording' && (
                  <>
                    {[0, 0.4, 0.8, 1.2].map((delay, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-[#00d4ff]/30"
                        style={{ width: 200, height: 200 }}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 2.5 + i * 0.3, opacity: 0 }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          delay,
                          ease: 'easeOut',
                        }}
                      />
                    ))}
                  </>
                )}

                {/* Processing: spinning ring */}
                {scannerState === 'processing' && (
                  <motion.div
                    className="absolute w-[220px] h-[220px] rounded-full border-2 border-transparent border-t-[#00d4ff] border-r-[#00d4ff]/30"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                  />
                )}

                {/* Ambient glow behind button */}
                <motion.div
                  className="absolute w-[180px] h-[180px] rounded-full"
                  animate={{
                    boxShadow: scannerState === 'recording'
                      ? '0 0 80px 20px rgba(0,212,255,0.25)'
                      : scannerState === 'processing'
                        ? '0 0 60px 15px rgba(0,212,255,0.15)'
                        : '0 0 40px 10px rgba(0,212,255,0.08)',
                  }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                />

                {/* THE BUTTON */}
                <motion.button
                  onClick={
                    scannerState === 'idle'
                      ? startRecording
                      : scannerState === 'fileReady'
                        ? analyzeUploadedFile
                        : undefined
                  }
                  disabled={scannerState === 'recording' || scannerState === 'processing'}
                  className={`relative z-10 w-[180px] h-[180px] rounded-full flex flex-col items-center justify-center transition-colors duration-500
                    ${scannerState === 'recording'
                      ? 'bg-[#00d4ff]/15 border-2 border-[#00d4ff]/60'
                      : scannerState === 'fileReady'
                        ? 'bg-[#10b981]/15 border-2 border-[#10b981]/60'
                        : scannerState === 'processing'
                          ? 'bg-white/5 border-2 border-white/10'
                          : 'bg-white/5 border-2 border-white/10 hover:border-[#00d4ff]/40 hover:bg-[#00d4ff]/5'
                    }`}
                  whileHover={scannerState === 'idle' ? { scale: 1.05 } : {}}
                  whileTap={scannerState === 'idle' ? { scale: 0.95 } : {}}
                  transition={springBouncy}
                >
                  {scannerState === 'processing' ? (
                    <div className="flex flex-col items-center gap-3">
                      <motion.div
                        className="w-8 h-8 border-2 border-[#00d4ff] border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      />
                      <span className="text-[10px] text-[#00d4ff] font-semibold tracking-[0.2em] uppercase">
                        Analiza AI...
                      </span>
                    </div>
                  ) : scannerState === 'recording' ? (
                    <div className="flex flex-col items-center gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                      >
                        <Mic className="w-10 h-10 text-[#00d4ff]" />
                      </motion.div>
                      <span className="text-2xl font-bold text-[#00d4ff] tabular-nums">{countdown}s</span>
                      <span className="text-[9px] text-[#00d4ff]/60 font-medium tracking-[0.2em] uppercase">
                        Nasłuchiwanie
                      </span>
                    </div>
                  ) : scannerState === 'fileReady' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Zap className="w-10 h-10 text-[#10b981]" />
                      <span className="text-[11px] text-[#10b981] font-bold tracking-[0.15em] uppercase">
                        Analizuj
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Mic className="w-10 h-10 text-white/70" />
                      <span className="text-[10px] text-white/40 font-medium tracking-[0.15em] uppercase">
                        Dotknij
                      </span>
                    </div>
                  )}
                </motion.button>
              </div>

              {/* ── Action pills below ── */}
              {(scannerState === 'idle' || scannerState === 'fileReady') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, ...springSmooth }}
                  className="flex gap-3 mt-6"
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
                    <Upload className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-xs text-white/70 font-medium">Upload Media</span>
                  </button>

                  <button
                    onClick={() => setShowContextSheet(true)}
                    className="glass-surface rounded-full px-5 py-3 flex items-center gap-2 hover:bg-white/8 transition-all active:scale-95"
                  >
                    <FileText className="w-4 h-4 text-[#f59e0b]" />
                    <span className="text-xs text-white/70 font-medium">Add Context</span>
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

              {/* Bottom spacer for context info */}
              {(category !== 'Auto' || makeModel || symptoms) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-8 text-center"
                >
                  <p className="text-[10px] text-white/20 uppercase tracking-widest">Kontekst aktywny</p>
                  <p className="text-[11px] text-white/40 mt-1">
                    {category}{makeModel ? ` • ${makeModel}` : ''}{symptoms ? ' • Objawy ✓' : ''}
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ────────── RESULTS VIEW ────────── */}
          {activeTab === 'home' && showResults && result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={springSmooth}
              className="px-5 pt-12 pb-8 space-y-4"
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
                  {/* ── Header ── */}
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

                  {/* ── BENTO: Main diagnosis ── */}
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
                      <span className="text-[#00d4ff] text-xs font-semibold">
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

                  {/* ── BENTO: 2-column grid ── */}
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
                      className="glass-surface rounded-2xl p-4 border-[#00d4ff]/10"
                      style={{ borderColor: 'rgba(0,212,255,0.1)' }}
                    >
                      <p className="text-[10px] text-[#00d4ff]/60 uppercase tracking-wider mb-2">
                        Koszt
                      </p>
                      <p className="text-base font-bold text-[#00d4ff]">
                        {result.cost_and_action?.match(/[\d,.]+\s*(?:PLN|zł)/i)?.[0] || '—'}
                      </p>
                      <p className="text-[10px] text-white/30 mt-1">szacunkowo</p>
                    </motion.div>
                  </div>

                  {/* ── BENTO: Recommendation ── */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, ...springSmooth }}
                    className="glass-surface rounded-2xl p-5"
                    style={{ borderColor: 'rgba(245,158,11,0.12)' }}
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
                      <div className="bg-[#00d4ff]/8 border border-[#00d4ff]/10 text-white/70 p-3 rounded-2xl rounded-tl-sm text-sm max-w-[85%] leading-relaxed">
                        {result.chat_opener || 'Słyszę ten problem. W czym mogę pomóc?'}
                      </div>
                    </div>
                    <div className="p-3 border-t border-white/5 flex gap-2">
                      <input
                        type="text"
                        placeholder="Zapytaj mechanika..."
                        className="flex-1 bg-white/5 text-sm text-white/70 p-2.5 rounded-xl border border-white/5 outline-none focus:border-[#00d4ff]/30 transition-colors placeholder:text-white/20"
                      />
                      <button className="bg-[#00d4ff]/10 text-[#00d4ff] px-4 rounded-xl hover:bg-[#00d4ff]/20 transition-colors">
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

          {/* ────────── HISTORY TAB ────────── */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={springSmooth}
              className="px-6 pt-14"
            >
              <h2 className="text-xl font-bold text-white/90 mb-6">Historia</h2>

              <div className="space-y-3">
                {[
                  { title: 'Stuk korbowodowy', severity: 'CRITICAL', date: '2 godz. temu', score: 92 },
                  { title: 'Łożysko alternatora', severity: 'MEDIUM', date: 'Wczoraj', score: 78 },
                  { title: 'Normalny dźwięk silnika', severity: 'SAFE', date: '3 dni temu', score: 95 },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, ...springSmooth }}
                    className="glass-surface rounded-2xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center
                        ${item.severity === 'CRITICAL' ? 'bg-red-500/10' : item.severity === 'SAFE' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}
                      >
                        <FileAudio className={`w-5 h-5 ${item.severity === 'CRITICAL' ? 'text-red-400' : item.severity === 'SAFE' ? 'text-green-400' : 'text-amber-400'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/80">{item.title}</p>
                        <p className="text-[10px] text-white/30">{item.date} • {item.score}% pewności</p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/20 -rotate-90" />
                  </motion.div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <p className="text-[10px] text-white/15 uppercase tracking-widest">Koniec historii</p>
              </div>
            </motion.div>
          )}

          {/* ────────── CHAT TAB ────────── */}
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
                  <div className="w-8 h-8 rounded-full bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Wrench className="w-4 h-4 text-[#00d4ff]" />
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
                  <div className="bg-[#00d4ff]/10 border border-[#00d4ff]/10 p-3.5 rounded-2xl rounded-tr-sm max-w-[75%]">
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
                  <div className="w-8 h-8 rounded-full bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Wrench className="w-4 h-4 text-[#00d4ff]" />
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
                <button className="bg-[#00d4ff]/10 text-[#00d4ff] px-4 rounded-xl hover:bg-[#00d4ff]/20 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ────────── SETTINGS TAB ────────── */}
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
                    <div className="w-9 h-9 rounded-xl bg-[#6366f1]/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-[#6366f1]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/80">Język</p>
                      <p className="text-[10px] text-white/30">Polski / English</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <span className="px-2.5 py-1 rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] text-xs font-bold">PL</span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 text-white/30 text-xs font-medium">EN</span>
                  </div>
                </div>

                {/* Account */}
                <div className="glass-surface rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#10b981]" />
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
                    <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-[#f59e0b]" />
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
         FLOATING CHAT NOTIFICATION BUBBLE
         ═══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showChatBubble && showResults && result && !result.error && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={springBouncy}
            className="fixed bottom-28 right-5 z-30"
          >
            <button
              onClick={() => setShowChatBubble(false)}
              className="glass-surface-strong rounded-2xl p-4 max-w-[260px] shadow-2xl shadow-black/50 text-left group"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">AI Mechanik</span>
                <X className="w-3 h-3 text-white/20 ml-auto group-hover:text-white/40" />
              </div>
              <p className="text-xs text-white/60 leading-relaxed line-clamp-2">
                {result.chat_opener || 'Mam pytanie do wyników diagnostyki...'}
              </p>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
                        ? 'bg-[#00d4ff]/15 text-[#00d4ff] border border-[#00d4ff]/30'
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
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white/80 mb-5 focus:border-[#00d4ff]/30 outline-none transition-colors placeholder:text-white/15"
              />

              {/* Symptoms */}
              <label className="text-[10px] text-white/30 uppercase tracking-widest mb-2 block">
                Objawy
              </label>
              <textarea
                placeholder="np. stuka na zimnym silniku, grzechocze przy 2000 obr..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white/80 h-28 focus:border-[#00d4ff]/30 outline-none resize-none transition-colors placeholder:text-white/15"
              />

              {/* Save button */}
              <button
                onClick={() => setShowContextSheet(false)}
                className="w-full mt-6 bg-[#00d4ff]/15 border border-[#00d4ff]/20 text-[#00d4ff] font-semibold py-3.5 rounded-2xl hover:bg-[#00d4ff]/25 transition-all active:scale-[0.98]"
              >
                Zapisz Kontekst
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════
         BOTTOM NAVIGATION BAR
         ═══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 safe-bottom">
        <motion.nav
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, ...springBouncy }}
          className="glass-surface-strong rounded-full px-2 py-2 flex items-center gap-1"
        >
          {([
            { id: 'home' as TabId, icon: Home, label: 'Skaner' },
            { id: 'history' as TabId, icon: Clock, label: 'Historia' },
            { id: 'chat' as TabId, icon: MessageCircle, label: 'Czat' },
            { id: 'settings' as TabId, icon: Settings, label: 'Ustawienia' },
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'home') {
                    setShowResults(false);
                    setShowChatBubble(false);
                  }
                }}
                className={`relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-full transition-all duration-300
                  ${isActive ? 'bg-white/10' : 'hover:bg-white/5'}`}
              >
                <tab.icon
                  className={`w-5 h-5 transition-colors duration-300
                    ${isActive ? 'text-[#00d4ff]' : 'text-white/30'}`}
                />
                <span
                  className={`text-[9px] font-medium transition-colors duration-300
                    ${isActive ? 'text-[#00d4ff]' : 'text-white/20'}`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.nav>
      </div>
    </div>
  );
}