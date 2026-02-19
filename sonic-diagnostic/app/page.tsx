'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Activity, AlertTriangle, Wrench, Square, RefreshCcw,
  ChevronRight, Upload, MessageSquare, Cpu, Home, Cog
} from 'lucide-react';
import { analyzeMedia } from './actions';

// ── Types ──
type MachineCategory = 'auto' | 'home_appliance' | 'heavy_tech' | null;

const CATEGORIES: { id: MachineCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'auto', label: 'Auto', icon: <Cpu className="w-5 h-5" /> },
  { id: 'home_appliance', label: 'Home Appliance', icon: <Home className="w-5 h-5" /> },
  { id: 'heavy_tech', label: 'Heavy Tech', icon: <Cog className="w-5 h-5" /> },
];

// ── Slide variants ──
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(6px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    filter: 'blur(6px)',
  }),
};

export default function SonicDiagnostic() {
  // ── Wizard state ──
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // ── Step 1: context ──
  const [machineCategory, setMachineCategory] = useState<MachineCategory>(null);
  const [makeModel, setMakeModel] = useState('');
  const [symptoms, setSymptoms] = useState('');

  // ── Step 2: recording & upload ──
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Step 3: result ──
  const [result, setResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Navigation helpers ──
  const goTo = (target: number) => {
    setDirection(target > step ? 1 : -1);
    setStep(target);
  };

  const resetAll = () => {
    setMachineCategory(null);
    setMakeModel('');
    setSymptoms('');
    setResult(null);
    setIsRecording(false);
    setIsProcessing(false);
    setUploadedFileName(null);
    setIsDragOver(false);
    goTo(1);
  };

  // ── Recording logic (preserved) ──
  const startRecording = async () => {
    setResult(null);
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
          setIsProcessing(true);
          try {
            const diagnosis = await analyzeMedia(base64Audio, 'audio/webm', {
              category: machineCategory || 'unknown',
              makeModel,
              symptoms,
            });
            setResult(diagnosis);
            setDirection(1);
            setStep(3);
          } catch (err: any) {
            setResult({ error: err?.message || 'Analysis failed. Please try again.' });
            setDirection(1);
            setStep(3);
          } finally {
            setIsProcessing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

      timeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          stopRecording();
        }
      }, 15000);
    } catch {
      console.error('Mic Error');
      alert('Microphone access denied or error occurred.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // ── File upload handler ──
  const handleFileUpload = async (file: File) => {
    const allowedTypes = [
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(`Unsupported file type: ${file.type}. Please upload audio, video, or image files.`);
      return;
    }

    // 25MB limit for Gemini inline data
    if (file.size > 25 * 1024 * 1024) {
      alert('File too large. Maximum size is 25MB.');
      return;
    }

    setUploadedFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const diagnosis = await analyzeMedia(base64, file.type, {
          category: machineCategory || 'unknown',
          makeModel,
          symptoms,
        });
        setResult(diagnosis);
        setDirection(1);
        setStep(3);
      } catch (err: any) {
        setResult({ error: err?.message || 'Analysis failed. Please try again.' });
        setDirection(1);
        setStep(3);
      } finally {
        setIsProcessing(false);
      }
    };
  };

  // ── Step indicator ──
  const StepIndicator = () => (
    <div className="flex items-center gap-3 mb-10">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-3">
          <div className={`
            w-8 h-8 rounded-full border flex items-center justify-center text-[10px] font-bold tracking-wider transition-all duration-500
            ${s === step
              ? 'border-[#00f0ff] text-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_20px_-4px_rgba(0,240,255,0.3)]'
              : s < step
                ? 'border-[#f59e0b]/40 text-[#f59e0b] bg-[#f59e0b]/5'
                : 'border-white/10 text-white/20 bg-white/[0.02]'}
          `}>
            {s < step ? '✓' : `0${s}`}
          </div>
          {s < 3 && (
            <div className={`w-8 h-[1px] transition-colors duration-500 ${s < step ? 'bg-[#f59e0b]/30' : 'bg-white/5'}`} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020202] text-gray-300 font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
      </div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#f59e0b]/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00f0ff]/5 blur-[120px] rounded-full"></div>

      {/* HEADER */}
      <header className="z-10 mb-8 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-3 text-[#f59e0b] mb-4"
        >
          <div className="h-[1px] w-8 bg-[#f59e0b]/30"></div>
          <Activity className="w-5 h-5 animate-pulse" />
          <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Sonic System V3.0</span>
          <div className="h-[1px] w-8 bg-[#f59e0b]/30"></div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-4"
        >
          ACOUSTIC<br />INTELLIGENCE
        </motion.h1>
        <p className="text-xs text-gray-500 tracking-[0.2em] font-light">PREDICTIVE MECHANICAL MAINTENANCE MODULE</p>
      </header>

      {/* STEP INDICATOR */}
      <div className="z-10">
        <StepIndicator />
      </div>

      {/* WIZARD BODY */}
      <div className="relative z-10 w-full max-w-3xl min-h-[420px] flex items-start justify-center">
        <AnimatePresence mode="wait" custom={direction}>

          {/* ═══════ STEP 1: INITIALIZE PARAMETERS ═══════ */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full"
            >
              <div className="bg-[#0a0a0a]/60 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
                {/* Section label */}
                <div className="flex items-center gap-2 mb-8">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse" />
                  <span className="text-[9px] uppercase tracking-[0.3em] text-[#00f0ff] font-bold">Initialize Parameters</span>
                </div>

                {/* Machine Category */}
                <div className="mb-7">
                  <label className="block text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-3">
                    Machine Category
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setMachineCategory(cat.id)}
                        className={`
                          group relative flex flex-col items-center gap-2.5 py-5 px-3 rounded-xl border transition-all duration-300
                          ${machineCategory === cat.id
                            ? 'border-[#f59e0b]/60 bg-[#f59e0b]/[0.08] text-[#f59e0b] shadow-[0_0_30px_-8px_rgba(245,158,11,0.25)]'
                            : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:border-white/20 hover:bg-white/[0.04] hover:text-gray-300'}
                        `}
                      >
                        <div className={`transition-transform duration-300 ${machineCategory === cat.id ? 'scale-110' : 'group-hover:scale-105'}`}>
                          {cat.icon}
                        </div>
                        <span className="text-[9px] uppercase tracking-[0.15em] font-bold">{cat.label}</span>
                        {machineCategory === cat.id && (
                          <motion.div
                            layoutId="cat-indicator"
                            className="absolute -bottom-px left-1/4 right-1/4 h-[2px] bg-[#f59e0b] rounded-full"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Make & Model */}
                <div className="mb-6">
                  <label className="block text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-2.5">
                    Make & Model <span className="text-gray-600 normal-case tracking-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    placeholder="e.g. BMW E46 320d"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00f0ff]/30 focus:bg-[#00f0ff]/[0.02] transition-all duration-300 font-mono"
                  />
                </div>

                {/* Observed Symptoms */}
                <div className="mb-8">
                  <label className="block text-[9px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-2.5">
                    Observed Symptoms
                  </label>
                  <input
                    type="text"
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="e.g. Knocking from engine bay at idle"
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00f0ff]/30 focus:bg-[#00f0ff]/[0.02] transition-all duration-300 font-mono"
                  />
                </div>

                {/* Proceed Button */}
                <button
                  onClick={() => goTo(2)}
                  disabled={!machineCategory}
                  className={`
                    w-full py-4 rounded-xl border text-[10px] uppercase tracking-[0.3em] font-bold flex items-center justify-center gap-2.5 transition-all duration-300 group
                    ${machineCategory
                      ? 'border-[#f59e0b]/40 bg-[#f59e0b]/[0.06] text-[#f59e0b] hover:bg-[#f59e0b]/[0.12] hover:border-[#f59e0b]/60 hover:shadow-[0_0_30px_-8px_rgba(245,158,11,0.3)] cursor-pointer'
                      : 'border-white/[0.04] bg-white/[0.01] text-gray-600 cursor-not-allowed'}
                  `}
                >
                  Proceed to Capture
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${machineCategory ? 'group-hover:translate-x-1' : ''}`} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══════ STEP 2: AUDIO CAPTURE ═══════ */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full flex flex-col items-center"
            >
              {/* Section label */}
              <div className="flex items-center gap-2 mb-10">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#f59e0b] font-bold">Media Capture</span>
              </div>

              {/* SONAR BUTTON */}
              <div className="relative mb-12">
                <AnimatePresence>
                  {isRecording && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.8, opacity: 0.8 }}
                          animate={{ scale: 2.2, opacity: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, ease: 'easeOut' }}
                          className="absolute inset-0 rounded-full border border-[#f59e0b]/30"
                        />
                      ))}
                    </>
                  )}
                </AnimatePresence>

                <button
                  onClick={isRecording ? stopRecording : (isProcessing ? undefined : startRecording)}
                  disabled={isProcessing}
                  className={`group relative w-52 h-52 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-500
                    ${isRecording ? 'border-[#f59e0b] bg-[#f59e0b]/5 shadow-[0_0_50px_-12px_rgba(245,158,11,0.3)]' :
                      isProcessing ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_50px_-12px_rgba(6,182,212,0.3)]' :
                        'border-white/10 hover:border-white/40 bg-white/[0.02] hover:bg-white/[0.05]'}
                  `}
                >
                  {isProcessing ? (
                    <div className="text-center z-10">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-10 h-10 border-2 border-t-cyan-500 border-white/10 rounded-full mx-auto mb-4"
                      />
                      <span className="text-[9px] tracking-[0.2em] text-cyan-500 font-bold uppercase">Analyzing Signals</span>
                    </div>
                  ) : isRecording ? (
                    <div className="text-center z-10">
                      <Square className="w-10 h-10 mx-auto mb-3 text-[#f59e0b] fill-[#f59e0b]/20" />
                      <span className="text-[9px] tracking-[0.2em] text-[#f59e0b] font-bold uppercase">End Capture</span>
                      <div className="flex gap-1 justify-center mt-3">
                        {[1, 2, 3, 4].map(i => (
                          <motion.div
                            key={i}
                            animate={{ height: [4, 12, 4] }}
                            transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.1 }}
                            className="w-1 bg-[#f59e0b] rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center z-10 transition-transform group-hover:scale-110 duration-300">
                      <Mic className="w-12 h-12 mx-auto mb-3 text-white opacity-80" />
                      <span className="text-[9px] tracking-[0.2em] text-white/40 font-bold uppercase group-hover:text-white">Start Scan</span>
                    </div>
                  )}
                </button>
              </div>

              {/* UPLOAD DROP-ZONE */}
              <div className="w-full max-w-md">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.04]" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-[#020202] px-4 text-[8px] uppercase tracking-[0.3em] text-gray-600 font-bold">or</span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*,video/*,image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={isProcessing}
                  className={`mt-5 w-full py-6 border-2 border-dashed rounded-2xl flex flex-col items-center gap-2.5 transition-all duration-300 cursor-pointer group
                    ${isDragOver
                      ? 'border-[#00f0ff]/40 bg-[#00f0ff]/[0.04] text-[#00f0ff]'
                      : 'border-white/[0.06] text-gray-600 hover:border-white/10 hover:text-gray-500 hover:bg-white/[0.01]'}
                    ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Upload className={`w-5 h-5 transition-transform duration-300 ${isDragOver ? 'scale-110' : 'group-hover:scale-110'}`} />
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold">
                    {uploadedFileName || 'Upload Audio / Video / Image'}
                  </span>
                  <span className="text-[8px] text-gray-700 tracking-wider">WAV • MP3 • MP4 • WEBM • JPG • PNG</span>
                </button>
              </div>

              {/* Back link */}
              <button
                onClick={() => goTo(1)}
                className="mt-8 text-[9px] uppercase tracking-[0.2em] text-gray-600 hover:text-gray-400 transition-colors cursor-pointer font-bold"
              >
                ← Back to Parameters
              </button>
            </motion.div>
          )}

          {/* ═══════ STEP 3: DIAGNOSTIC REPORT ═══════ */}
          {step === 3 && result && (
            <motion.div
              key="step-3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full"
            >
              {/* Section label */}
              <div className="flex items-center gap-2 mb-6 justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] uppercase tracking-[0.3em] text-green-500 font-bold">Diagnostic Report</span>
              </div>

              {/* ERROR STATE */}
              {result.error ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-red-400 border border-red-500/20 bg-red-500/5 p-6 rounded-2xl flex items-center gap-5 ring-1 ring-red-500/10"
                >
                  <div className="bg-red-500/20 p-3 rounded-lg flex-shrink-0">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-1">Diagnostic Fault</p>
                    <p className="text-sm opacity-80 leading-relaxed">{result.error}</p>
                  </div>
                </motion.div>
              ) : (
                /* SUCCESS: RESULTS CARD */
                <div className="bg-[#111]/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className={`h-1 w-full ${result.severity === 'CRITICAL' ? 'bg-red-500' :
                    result.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />

                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded font-bold mb-3 inline-block ${result.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' :
                          result.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'
                          }`}>
                          {result.severity} Priority
                        </span>
                        <h3 className="text-white text-3xl font-bold tracking-tight leading-tight">{result.diagnosis}</h3>
                        <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-2 font-bold tracking-widest uppercase opacity-60">
                          Source Identification: {result.detected_source}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white tracking-tighter">94%</div>
                        <div className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Confidence</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 pt-6 border-t border-white/[0.05]">
                      <div className="space-y-2">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Acoustic Signature</span>
                        <p className="text-white text-sm leading-relaxed">{result.sound_profile}</p>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Projected Recovery</span>
                        <p className="text-cyan-400 text-2xl font-bold tracking-tight">{result.estimated_cost}</p>
                      </div>
                    </div>

                    <div className="bg-white/[0.03] p-6 rounded-xl border border-white/5 relative group">
                      <div className="absolute top-4 right-4 opacity-20">
                        <Wrench className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-[9px] text-cyan-500/60 mb-3 uppercase tracking-[0.2em] font-bold">Actionable Protocol</p>
                      <p className="text-gray-300 text-sm leading-relaxed italic">&quot;{result.action_plan}&quot;</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="mt-6 flex flex-col gap-3">
                {/* Consult AI Mechanic (placeholder) */}
                <button
                  className="w-full py-4 rounded-xl border border-[#f59e0b]/20 bg-[#f59e0b]/[0.04] text-[10px] uppercase tracking-[0.3em] font-bold text-[#f59e0b]/60 flex items-center justify-center gap-2.5 cursor-not-allowed group"
                  disabled
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Consult AI Mechanic
                  <span className="text-[7px] tracking-[0.15em] text-[#f59e0b]/30 ml-1">Coming Soon</span>
                </button>

                {/* New Scan */}
                <button
                  onClick={resetAll}
                  className="w-full py-4 rounded-xl border border-white/5 bg-white/[0.02] text-[9px] text-gray-500 uppercase tracking-[0.4em] font-bold hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <RefreshCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                  New Scan
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER */}
      <footer className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
        <div className="text-[8px] text-white/10 tracking-[1em] uppercase mb-1">Real-Time Spectral Analysis Feed</div>
        <div className="flex gap-1 justify-center opacity-10">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="w-0.5 h-4 bg-white rounded-full"></div>
          ))}
        </div>
      </footer>
    </div>
  );
}