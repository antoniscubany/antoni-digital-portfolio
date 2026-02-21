'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Activity, AlertTriangle, Wrench, Square, RefreshCcw,
  ChevronRight, Upload, MessageSquare, Cpu, Home, Factory
} from 'lucide-react';
import { analyzeMedia } from './actions';

// ── Types ──
type MachineCategory = 'auto' | 'home_appliance' | 'industrial' | null;

const CATEGORIES: { id: MachineCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'auto', label: 'Auto', icon: <Cpu className="w-5 h-5 mb-1" /> },
  { id: 'home_appliance', label: 'Home Appliance', icon: <Home className="w-5 h-5 mb-1" /> },
  { id: 'industrial', label: 'Industrial', icon: <Factory className="w-5 h-5 mb-1" /> },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.98,
  }),
};

export default function SonicDiagnostic() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  const [machineCategory, setMachineCategory] = useState<MachineCategory>(null);
  const [makeModel, setMakeModel] = useState('');
  const [symptoms, setSymptoms] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [result, setResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    goTo(1);
  };

  const startScanSimulation = async () => {
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

          const minDelay = new Promise(resolve => setTimeout(resolve, 3000));

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
      alert('Microphone access denied. Please allow microphone permissions.');
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

  const handleFileUpload = async (file: File) => {
    const allowedTypes = [
      'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(`Unsupported file type: ${file.type}`);
      return;
    }
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
      const minDelay = new Promise(resolve => setTimeout(resolve, 3000));

      try {
        const [diagnosis] = await Promise.all([
          analyzeMedia(base64, file.type, {
            category: machineCategory || 'unknown',
            makeModel,
            symptoms,
          }),
          minDelay
        ]);
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

  // Fixed 100dvh styling
  useEffect(() => {
    const setHeight = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    setHeight();
    window.addEventListener('resize', setHeight);
    return () => window.removeEventListener('resize', setHeight);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .dvh-screen { height: 100vh; height: calc(var(--vh, 1vh) * 100); }
      `}} />

      <div className="dvh-screen w-full bg-[#020202] text-gray-300 font-mono relative overflow-hidden flex flex-col">
        {/* GRID BACKGROUND */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
        </div>
        <div className="absolute top-[-10%] left-[-20%] w-[60%] h-[60%] bg-[#f59e0b]/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[60%] h-[60%] bg-[#00f0ff]/5 blur-[120px] rounded-full pointer-events-none"></div>

        {/* HEADER */}
        <header className="z-10 pt-6 pb-2 px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#f59e0b] animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#f59e0b]">Sonic OS</span>
          </div>
          <div className="text-[10px] text-white/20 tracking-widest font-bold">V 3.0</div>
        </header>

        {/* MAIN AREA */}
        <div className="flex-1 relative w-full overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>

            {/* ═ STATE 1: INITIALIZE PARAMETERS ═ */}
            {step === 1 && (
              <motion.div
                key="step-1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 w-full h-full flex flex-col px-6 pb-6 pt-2"
              >
                <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col">
                  <div className="mb-8 mt-2">
                    <h1 className="text-2xl text-white font-bold tracking-tighter uppercase leading-none">Initialize<br />Parameters</h1>
                    <div className="h-[1px] w-12 bg-[#00f0ff]/30 mt-4" />
                  </div>

                  <div className="flex flex-col gap-6 flex-1">
                    {/* Category Toggle */}
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-3 block font-bold">
                        Machine Category
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => setMachineCategory(cat.id)}
                            className={`
                              relative flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl border transition-all duration-300
                              ${machineCategory === cat.id
                                ? 'border-[#f59e0b]/50 bg-[#f59e0b]/[0.08] text-[#f59e0b]'
                                : 'border-white/5 bg-white/[0.02] text-white/40'}
                            `}
                          >
                            <div className={`transition-transform duration-300 ${machineCategory === cat.id ? 'scale-110' : ''}`}>
                              {cat.icon}
                            </div>
                            <span className="text-[8px] uppercase tracking-[0.1em] font-bold text-center leading-tight">
                              {cat.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Make & Model */}
                    <div>
                      <label className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-3 block font-bold">
                        Make & Model
                      </label>
                      <input
                        type="text"
                        value={makeModel}
                        onChange={(e) => setMakeModel(e.target.value)}
                        placeholder="e.g. BMW e46"
                        className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00f0ff]/30 focus:bg-[#00f0ff]/[0.02] transition-colors font-mono"
                      />
                    </div>

                    {/* Symptoms */}
                    <div className="flex-1 flex flex-col min-h-[120px]">
                      <label className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-3 block font-bold">
                        Symptoms
                      </label>
                      <textarea
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Describe the noise..."
                        className="flex-1 w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#00f0ff]/30 focus:bg-[#00f0ff]/[0.02] transition-colors font-mono resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 shrink-0 mt-auto">
                  <button
                    onClick={() => goTo(2)}
                    disabled={!machineCategory}
                    className={`
                      w-full py-5 rounded-2xl border text-[11px] uppercase tracking-[0.3em] font-bold transition-all duration-300 flex items-center justify-center gap-2
                      ${machineCategory
                        ? 'border-[#00f0ff]/40 bg-[#00f0ff]/10 text-[#00f0ff] shadow-[0_0_20px_-5px_rgba(0,240,255,0.3)] hover:bg-[#00f0ff]/20'
                        : 'border-white/5 bg-white/[0.02] text-white/20 opacity-50 cursor-not-allowed'}
                    `}
                  >
                    Proceed To Sensor
                    <ChevronRight className={`w-4 h-4 ${machineCategory ? 'opacity-100' : 'opacity-0'}`} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ═ STATE 2: CAPTURE ═ */}
            {step === 2 && (
              <motion.div
                key="step-2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 w-full h-full flex flex-col px-6 pb-6 pt-2"
              >
                <div className="shrink-0">
                  <button
                    onClick={() => goTo(1)}
                    disabled={isProcessing}
                    className="text-[9px] uppercase tracking-[0.2em] text-white/40 py-2 active:text-white/80 transition-colors"
                  >
                    ← Back
                  </button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative w-full -mt-4">

                  {/* Sonar / Mic Button */}
                  <div className="relative mb-14 flex justify-center items-center w-full">
                    <AnimatePresence>
                      {isRecording && !isProcessing && (
                        <>
                          {[1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0.7, opacity: 1 }}
                              animate={{ scale: 2.5, opacity: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, ease: 'easeOut' }}
                              className="absolute rounded-full border border-[#f59e0b]/40 bg-[#f59e0b]/5 aspect-square h-full"
                            />
                          ))}
                        </>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={isRecording ? stopRecording : (isProcessing ? undefined : startScanSimulation)}
                      disabled={isProcessing}
                      className={`relative z-10 w-48 h-48 rounded-full border flex flex-col items-center justify-center transition-all duration-500
                        ${isRecording ? 'border-[#f59e0b] bg-[#f59e0b]/10 shadow-[0_0_50px_-12px_rgba(245,158,11,0.4)]' :
                          isProcessing ? 'border-[#00f0ff] bg-[#00f0ff]/10 shadow-[0_0_50px_-12px_rgba(0,240,255,0.4)]' :
                            'border-white/10 bg-white/[0.03] active:border-white/20 active:bg-white/[0.05]'}
                      `}
                    >
                      {isProcessing ? (
                        <div className="text-center flex flex-col items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                            className="w-10 h-10 border-2 border-[#00f0ff] border-t-transparent rounded-full"
                          />
                          <span className="text-[10px] tracking-[0.3em] text-[#00f0ff] font-bold uppercase animate-pulse">
                            Processing...
                          </span>
                        </div>
                      ) : isRecording ? (
                        <div className="text-center">
                          <Square className="w-10 h-10 mx-auto mb-3 text-[#f59e0b] fill-[#f59e0b]/20" />
                          <span className="text-[10px] tracking-[0.2em] text-[#f59e0b] font-bold uppercase">End Capture</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Mic className="w-12 h-12 mx-auto mb-4 text-white opacity-90" />
                          <span className="text-[10px] tracking-[0.3em] text-white/50 font-bold uppercase">Start Scan</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Upload Section */}
                  <div className="w-full mt-4">
                    <div className="flex items-center gap-4 w-full mb-6">
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-white/10" />
                      <span className="text-[9px] uppercase tracking-[0.3em] text-white/30 font-bold shrink-0">Or Upload Media File</span>
                      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-white/10" />
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
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-5 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center gap-3 active:bg-white/5 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-white/50" />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/70">
                        Select Audio / Video
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ═ STATE 3: REPORT ═ */}
            {step === 3 && result && (
              <motion.div
                key="step-3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="absolute inset-0 w-full h-full flex flex-col p-6 overflow-y-auto hide-scrollbar"
              >
                {/* Report Card */}
                <div className="flex-1 rounded-3xl bg-white/[0.02] border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col hide-scrollbar">
                  {result.error ? (
                    <div className="p-8 flex-1 flex flex-col items-center justify-center text-center">
                      <AlertTriangle className="w-12 h-12 text-red-500 mb-4 opacity-80" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-red-500 mb-2">Analysis Failed</h3>
                      <p className="text-[11px] text-white/60 leading-relaxed font-mono">{result.error}</p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col relative w-full overflow-y-auto hide-scrollbar">
                      {/* Severity Bar */}
                      <div className={`shrink-0 h-1.5 w-full ${result.severity === 'CRITICAL' ? 'bg-red-500' :
                        result.severity === 'MEDIUM' ? 'bg-[#f59e0b]' : 'bg-green-500'
                        }`} />

                      <div className="px-6 pt-6 pb-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-6">
                          <span className={`inline-block text-[9px] uppercase tracking-widest px-2.5 py-1 rounded font-bold ${result.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-500' :
                            result.severity === 'MEDIUM' ? 'bg-[#f59e0b]/20 text-[#f59e0b]' : 'bg-green-500/20 text-green-500'
                            }`}>
                            {result.severity} Priority
                          </span>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white tracking-tighter">94%</div>
                            <div className="text-[7px] text-white/40 uppercase tracking-widest font-bold">Confidence</div>
                          </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white tracking-tight leading-tight mb-2">
                          {result.diagnosis}
                        </h2>
                        <div className="text-[9px] text-white/40 tracking-widest uppercase font-bold mb-8">
                          Source: <span className="text-white/80">{result.detected_source}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                            <div className="text-[8px] text-white/40 uppercase tracking-widest mb-1 font-bold">Signature</div>
                            <div className="text-[10px] text-white/80 leading-relaxed">{result.sound_profile}</div>
                          </div>
                          <div className="bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                            <div className="text-[8px] text-white/40 uppercase tracking-widest mb-1 font-bold">Estimated Cost</div>
                            <div className="text-lg font-bold text-[#00f0ff]">{result.estimated_cost}</div>
                          </div>
                        </div>

                        <div className="mt-auto shrink-0 bg-[#00f0ff]/5 p-5 rounded-2xl border border-[#00f0ff]/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Wrench className="w-3.5 h-3.5 text-[#00f0ff]" />
                            <span className="text-[9px] text-[#00f0ff] uppercase tracking-widest font-bold">Actionable Protocol</span>
                          </div>
                          <p className="text-[11px] text-white/70 leading-relaxed italic">
                            &quot;{result.action_plan}&quot;
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-4 shrink-0 flex flex-col gap-3">
                  <button className="w-full py-4 rounded-2xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 flex items-center justify-center gap-3 text-[#f59e0b] font-bold uppercase tracking-[0.2em] text-[10px] active:bg-[#f59e0b]/20 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Consult AI Mechanic
                  </button>

                  <button
                    onClick={resetAll}
                    className="w-full py-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-center gap-2 text-white/50 font-bold uppercase tracking-[0.3em] text-[10px] active:bg-white/5 transition-colors"
                  >
                    <RefreshCcw className="w-3.5 h-3.5" />
                    New Scan
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </>
  );
}