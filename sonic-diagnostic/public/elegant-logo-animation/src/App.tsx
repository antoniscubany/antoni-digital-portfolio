/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, useAnimation, useMotionValue, useSpring, useTransform } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export default function App() {
  const [hasAnimated, setHasAnimated] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDiagnosticText, setShowDiagnosticText] = useState(false);
  const [typedText, setTypedText] = useState("");
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const bgControls = useAnimation();
  const chevronControls = useAnimation();
  const dotControls = useAnimation();
  const textControls = useAnimation();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 30, stiffness: 100 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), springConfig);

  const sharpPath = "M 30 60 L 50 25 L 50 25 L 70 60 L 58 60 L 50 46 L 50 46 L 42 60 Z";
  const squarePath = "M 30 60 L 49.2 26.4 L 50.8 26.4 L 70 60 L 58 60 L 50.8 47.4 L 49.2 47.4 L 42 60 Z";

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!hasAnimated) return;
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX / innerWidth - 0.5);
    mouseY.set(clientY / innerHeight - 0.5);
  };

  // Digital typing effect
  useEffect(() => {
    if (showDiagnosticText) {
      let i = 0;
      const text = "SONIC DIAGNOSTIC";
      const interval = setInterval(() => {
        setTypedText(text.slice(0, i + 1));
        
        // Play professional, subtle UI tick
        if (soundEnabled && audioCtxRef.current) {
          const ctx = audioCtxRef.current;
          if (ctx.state === 'suspended') ctx.resume();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          // Fast frequency drop creates a sharp, clean "tick"
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
      }, 45); // Fast typing speed
      
      return () => clearInterval(interval);
    }
  }, [showDiagnosticText, soundEnabled]);

  const playProfessionalSound = () => {
    if (!soundEnabled) return;
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;

    // 1. Soft, warm sub-bass swell (Foundation)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, t); // Low A
    
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0, t);
    subGain.gain.linearRampToValueAtTime(0.3, t + 0.8);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);
    
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 3.5);

    // 2. Elegant Glassy Chord (Amaj9: A, C#, E, G#, B)
    const frequencies = [440.00, 554.37, 659.25, 830.61, 987.77];
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      
      // Stagger the attack slightly for an organic, airy feel
      const attackTime = t + 0.1 + (index * 0.08);
      gain.gain.linearRampToValueAtTime(0.04, attackTime);
      gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 2.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 3.5);
    });

    // 3. Crisp, precise "Ping" when the dot lands (syncs with dot animation at ~0.9s)
    const pingTime = t + 0.9;
    const pingOsc = ctx.createOscillator();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(1760.00, pingTime); // High A (A6)
    
    const pingGain = ctx.createGain();
    pingGain.gain.setValueAtTime(0, pingTime);
    pingGain.gain.linearRampToValueAtTime(0.15, pingTime + 0.01);
    pingGain.gain.exponentialRampToValueAtTime(0.001, pingTime + 1.5);
    
    pingOsc.connect(pingGain);
    pingGain.connect(ctx.destination);
    pingOsc.start(pingTime);
    pingOsc.stop(pingTime + 1.5);
  };

  const handleAnimate = async () => {
    if (hasAnimated) return;
    setHasAnimated(true);
    
    // Initialize audio context on first user interaction
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) audioCtxRef.current = new AudioContext();
    }
    
    playProfessionalSound();

    textControls.start({ opacity: 0, scale: 0.9, transition: { duration: 0.5 } });

    bgControls.start({
      backgroundColor: '#0B1117', // Dark slate/navy from the image
      transition: { duration: 1.5, ease: [0.4, 0, 0.2, 1] }
    });

    chevronControls.start({
      d: squarePath,
      y: 0,
      scale: 1,
      fill: '#00C2FF', // Bright cyan from the image
      filter: 'drop-shadow(0px 0px 25px rgba(0, 194, 255, 0.8))', // Deep cyan glow
      transition: { duration: 1.2, ease: [0.34, 1.56, 0.64, 1] } 
    });

    await dotControls.start({
      y: [ -40, 0 ],
      scale: [ 0, 1.3, 1 ],
      opacity: [ 0, 1, 1 ],
      rx: [ 4, 4, 3.2 ],
      filter: [
        'drop-shadow(0px 0px 0px rgba(255, 255, 255, 0))',
        'drop-shadow(0px 0px 40px rgba(255, 255, 255, 1))',
        'drop-shadow(0px 0px 15px rgba(255, 255, 255, 0.8))'
      ],
      transition: { 
        delay: 0.9, 
        duration: 0.8, 
        times: [0, 0.6, 1],
        ease: 'easeOut' 
      }
    });

    // Start typing the diagnostic text shortly after the dot lands
    setTimeout(() => {
      setShowDiagnosticText(true);
    }, 150);

    // Continuous floating animation
    chevronControls.start({
      y: [0, -6, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
    });
    dotControls.start({
      y: [0, -3, 0],
      transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }
    });
  };

  return (
    <motion.div 
      className="min-h-screen w-full flex flex-col items-center justify-center overflow-hidden relative"
      initial={{ backgroundColor: '#FAFAFA' }}
      animate={bgControls}
      onMouseMove={handleMouseMove}
      onClick={handleAnimate}
      style={{ cursor: hasAnimated ? 'default' : 'pointer' }}
    >
      {/* Background Radial Gradient for depth */}
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: hasAnimated ? 1 : 0 }}
        transition={{ duration: 2 }}
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 194, 255, 0.03) 0%, transparent 60%)'
        }}
      />

      {/* Sound Toggle */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={(e) => { e.stopPropagation(); setSoundEnabled(!soundEnabled); }}
          className="p-3 rounded-full bg-black/5 hover:bg-black/10 data-[dark=true]:bg-white/10 data-[dark=true]:hover:bg-white/20 backdrop-blur-md transition-colors text-gray-500 data-[dark=true]:text-gray-400 data-[dark=true]:hover:text-white"
          data-dark={hasAnimated}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </div>

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
                filter: 'drop-shadow(0px 0px 0px rgba(0, 194, 255, 0))' 
              }}
              animate={chevronControls}
              strokeLinejoin="round"
              strokeLinecap="round"
              style={{ transformOrigin: '50% 50%' }}
            />
            {/* Dot / Square */}
            <motion.rect
              x="46"
              y="68"
              width="8"
              height="8"
              fill="#FFFFFF"
              initial={{ opacity: 0, scale: 0, y: -20, rx: 4 }}
              animate={dotControls}
              style={{ transformOrigin: '50% 72px' }}
            />
          </svg>
        </motion.div>

        {/* Diagnostic Text */}
        <div className="absolute -bottom-8 md:-bottom-12 h-6 flex items-center justify-center pointer-events-none">
          <span className="font-sans text-[10px] md:text-xs font-semibold tracking-[0.4em] text-[#8A9BA8] uppercase">
            {typedText}
            {showDiagnosticText && typedText.length < "SONIC DIAGNOSTIC".length && (
              <motion.span 
                className="inline-block w-1.5 h-3 bg-[#8A9BA8] ml-1 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.4, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </span>
        </div>
      </div>
      
      {!hasAnimated && (
        <motion.div 
          className="absolute bottom-20 flex flex-col items-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          exit={{ opacity: 0 }}
          animate={textControls}
        >
          <p className="text-gray-400 font-sans tracking-[0.2em] text-sm uppercase">
            Click to Reveal
          </p>
          <div className="w-px h-12 bg-gradient-to-b from-gray-300 to-transparent" />
        </motion.div>
      )}
    </motion.div>
  );
}
