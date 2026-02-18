'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Activity, AlertTriangle, CheckCircle, Wrench, Square, Zap, RefreshCcw } from 'lucide-react';
import { analyzeAudio } from './actions';

export default function SonicDiagnostic() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            const diagnosis = await analyzeAudio(base64Audio);
            setResult(diagnosis);
          } catch (err) {
            setResult({ error: "Analysis failed. Please try again." });
          } finally {
            setIsProcessing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 15 seconds max
      timeoutRef.current = setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          stopRecording();
        }
      }, 15000);

    } catch (err) {
      console.error("Mic Error:", err);
      alert("Microphone access denied or error occurred.");
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

  return (
    <div className="min-h-screen bg-[#020202] text-gray-300 font-mono flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }}>
      </div>
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#f59e0b]/5 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00f0ff]/5 blur-[120px] rounded-full"></div>

      <header className="z-10 mb-16 text-center">
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

      {/* INTERACTIVE SCANNER */}
      <div className="relative z-10 mb-20">
        <AnimatePresence>
          {isRecording && (
            <>
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.4, ease: "easeOut" }}
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
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
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
              <span className="text-[9px] tracking-[0.2em] text-white/40 font-bold uppercase group-hover:text-white">Start Diagnostics</span>
            </div>
          )}
        </button>
      </div>

      {/* DIAGNOSTIC OUTPUT */}
      <AnimatePresence mode="wait">
        {result && !result.error && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="z-10 w-full max-w-xl bg-[#111]/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
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
                <p className="text-gray-300 text-sm leading-relaxed italic">"{result.action_plan}"</p>
              </div>

              <button
                onClick={() => setResult(null)}
                className="mt-8 w-full py-4 rounded-xl border border-white/5 bg-white/[0.02] text-[9px] text-gray-500 uppercase tracking-[0.4em] font-bold hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 group"
              >
                <RefreshCcw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
                Re-Initialize Sensors
              </button>
            </div>
          </motion.div>
        )}

        {result && result.error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 mt-8 text-red-400 border border-red-500/20 bg-red-500/5 p-6 rounded-2xl flex items-center gap-5 max-w-md ring-1 ring-red-500/10"
          >
            <div className="bg-red-500/20 p-3 rounded-lg flex-shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-1">Diagnostic Fault</p>
              <p className="text-sm opacity-80 leading-relaxed">{result.error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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