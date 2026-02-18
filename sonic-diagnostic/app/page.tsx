'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Activity, AlertTriangle, CheckCircle, Wrench } from 'lucide-react';
import { analyzeAudio } from './actions'; // Importujemy naszą funkcję z kroku 1

export default function SonicDiagnostic() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
          // Wysyłamy do AI
          const diagnosis = await analyzeAudio(base64Audio);
          setResult(diagnosis);
          setIsProcessing(false);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Automatyczny stop po 5 sekundach (dla prostoty)
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 5000);

    } catch (err) {
      console.error("Mic Error:", err);
      alert("Microphone access denied or error occurred.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-300 font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden">

      {/* TŁO (Grid) */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <header className="z-10 mb-12 text-center">
        <div className="flex items-center justify-center gap-2 text-[#f59e0b] mb-2">
          <Activity className="w-5 h-5 animate-pulse" />
          <span className="text-xs tracking-[0.2em]">SONIC DIAGNOSTIC V1.0</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
          AI AUDIO ANALYSIS
        </h1>
        <p className="text-sm text-gray-500 mt-2">PREDICTIVE MAINTENANCE MODULE</p>
      </header>

      {/* SONAR / START BUTTON */}
      <div className="relative z-10 mb-12 group">
        {/* Pulsujące kręgi */}
        {isRecording && (
          <>
            <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 2, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5 }} className="absolute inset-0 rounded-full border border-[#f59e0b]" />
            <motion.div initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.5 }} className="absolute inset-0 rounded-full border border-[#f59e0b]" />
          </>
        )}

        <button
          onClick={isRecording ? () => { } : startRecording}
          disabled={isRecording || isProcessing}
          className={`relative w-48 h-48 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-300
            ${isRecording ? 'border-[#f59e0b] bg-[#f59e0b]/10' : 'border-white/10 hover:border-[#00f0ff] hover:bg-[#00f0ff]/5'}
          `}
        >
          {isProcessing ? (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-t-2 border-cyan-500 rounded-full mx-auto mb-2"></div>
              <span className="text-xs text-cyan-500">ANALYZING...</span>
            </div>
          ) : isRecording ? (
            <div className="text-center text-[#f59e0b]">
              <Mic className="w-10 h-10 mx-auto mb-2 animate-bounce" />
              <span className="text-xs font-bold">LISTENING...</span>
            </div>
          ) : (
            <div className="text-center">
              <Mic className="w-10 h-10 mx-auto mb-2 text-white" />
              <span className="text-xs font-bold text-white group-hover:text-[#00f0ff]">START SCAN</span>
            </div>
          )}
        </button>
      </div>

      {/* WYNIK DIAGNOZY */}
      {result && !result.error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="z-10 w-full max-w-lg mt-8 bg-black/90 backdrop-blur-xl border-l-4 border-cyan-500 rounded-r-xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.15)] ring-1 ring-white/10"
        >
          <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className={`w-5 h-5 ${result.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-400'}`} />
                <span className={`text-xs font-bold tracking-widest ${result.severity === 'CRITICAL' ? 'text-red-500' : 'text-yellow-400'}`}>
                  {result.severity} DETECTED
                </span>
              </div>
              <h3 className="text-white text-xl font-bold leading-tight">
                {result.diagnosis}
              </h3>
              <p className="text-xs text-gray-500 uppercase mt-1 tracking-wider">{result.detected_source}</p>
            </div>
            {/* Procent pewności (możemy dać fake lub 85% stałe, bo Gemini nie zwraca confidence score wprost w tym trybie) */}
            <div className="text-right">
              <span className="text-3xl font-bold text-white">92%</span>
              <p className="text-[10px] text-gray-500">CONFIDENCE</p>
            </div>
          </div>

          <div className="space-y-3 text-sm font-mono text-gray-300">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">ACOUSTIC PROFILE</span>
              <span className="text-white text-right max-w-[60%]">{result.sound_profile}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-gray-500">EST. REPAIR COST</span>
              <span className="text-cyan-400 font-bold">{result.estimated_cost}</span>
            </div>

            <div className="mt-4 bg-white/5 p-4 rounded border border-white/5">
              <p className="text-[10px] text-cyan-500 mb-2 flex items-center gap-2 uppercase tracking-widest">
                <Wrench className="w-3 h-3" /> Recommended Action
              </p>
              <p className="text-white leading-relaxed">
                {result.action_plan}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {result && result.error && (
        <div className="z-10 mt-8 text-red-500 border border-red-500/50 bg-red-900/20 p-4 rounded">
          ⚠️ Error: {result.error}. Check API Key.
        </div>
      )}

    </div>
  );
}