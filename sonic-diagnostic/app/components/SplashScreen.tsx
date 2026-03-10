'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, useAnimation, useMotionValue, useSpring, useTransform } from 'framer-motion';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [splashAnimated, setSplashAnimated] = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const [showDiagnosticText, setShowDiagnosticText] = useState(false);
  const [typedText, setTypedText] = useState('');
  const splashAudioCtxRef = useRef<AudioContext | null>(null);
  const bgControls = useAnimation();
  const chevronControls = useAnimation();
  const dotControls = useAnimation();
  const whiteCircleControls = useAnimation();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxSpring = { damping: 30, stiffness: 100 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [15, -15]), parallaxSpring);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-15, 15]), parallaxSpring);
  const sharpPath = 'M 30 60 L 50 25 L 50 25 L 70 60 L 58 60 L 50 46 L 50 46 L 42 60 Z';
  const squarePath = 'M 30 60 L 49.2 26.4 L 50.8 26.4 L 70 60 L 58 60 L 50.8 47.4 L 49.2 47.4 L 42 60 Z';

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!splashAnimated) return;
    mouseX.set(e.clientX / window.innerWidth - 0.5);
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

  useEffect(() => {
    const runSplash = async () => {
      setSplashAnimated(true);
      playSplashSound();
      whiteCircleControls.start({ scale: 0, transition: { duration: 1.2, ease: [0.4, 0, 0.2, 1] } });
      bgControls.start({ backgroundColor: '#0B1117', transition: { duration: 1.5, ease: [0.4, 0, 0.2, 1] } });
      chevronControls.start({
        d: squarePath, y: 0, scale: 1, fill: '#00C2FF',
        filter: 'drop-shadow(0px 0px 25px rgba(0, 194, 255, 0.8))',
        transition: { duration: 1.2, ease: [0.34, 1.56, 0.64, 1] },
      });
      await dotControls.start({
        y: [-40, 0], scale: [0, 1.3, 1], opacity: [0, 1, 1], rx: [4, 4, 3.2],
        filter: ['drop-shadow(0px 0px 0px rgba(255,255,255,0))', 'drop-shadow(0px 0px 40px rgba(255,255,255,1))', 'drop-shadow(0px 0px 15px rgba(255,255,255,0.8))'],
        transition: { delay: 0.9, duration: 0.8, times: [0, 0.6, 1], ease: 'easeOut' },
      });
      setTimeout(() => setShowDiagnosticText(true), 150);
      chevronControls.start({ y: [0, -6, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } });
      dotControls.start({ y: [0, -3, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 } });
      setTimeout(() => setSplashFading(true), 3800);
      setTimeout(() => onComplete(), 4600);
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
    return () => { window.removeEventListener('mousedown', unlock); window.removeEventListener('keydown', unlock); window.removeEventListener('touchstart', unlock); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden z-50 bg-[#0B1117]"
      initial={{ opacity: 1 }} animate={{ opacity: splashFading ? 0 : 1 }}
      transition={{ opacity: { duration: 0.8, ease: 'easeInOut' } }} onMouseMove={handleMouseMove}>
      <motion.div className="absolute rounded-full bg-[#E0F7FF] pointer-events-none"
        initial={{ scale: 30, width: '100vmax', height: '100vmax', filter: 'blur(8px)' }} animate={whiteCircleControls}
        style={{ transformOrigin: 'center center', boxShadow: '0 0 100px 40px rgba(59,130,246,0.3)', top: '50%', left: '50%', x: '-50%', y: 'calc(-50% + 22px)' }} />
      <motion.div className="absolute inset-0 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: splashAnimated ? 1 : 0 }}
        transition={{ duration: 2 }} style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,194,255,0.04) 0%, transparent 60%)' }} />
      <div style={{ perspective: 1200 }} className="relative z-10 flex flex-col items-center">
        <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-64 h-64 md:w-80 md:h-80 overflow-visible">
            <motion.path initial={{ d: sharpPath, y: 20, scale: 0.95, fill: '#4285F4', filter: 'drop-shadow(0px 0px 0px rgba(0,194,255,0))' }}
              animate={chevronControls} strokeLinejoin="round" strokeLinecap="round" style={{ transformOrigin: '50% 50%' }} />
            <motion.rect x="46" y="68" width="8" height="8" fill="#FFFFFF" initial={{ opacity: 0, scale: 0, y: -20, rx: 4 }}
              animate={dotControls} style={{ transformOrigin: '50% 72px' }} />
          </svg>
        </motion.div>
        <div className="absolute -bottom-8 md:-bottom-12 h-6 flex items-center justify-center pointer-events-none">
          <span className="font-sans text-[10px] md:text-xs font-semibold tracking-[0.4em] text-[#8A9BA8] uppercase">
            {typedText}
            {showDiagnosticText && typedText.length < 'SONIC DIAGNOSTIC'.length && (
              <motion.span className="inline-block w-1.5 h-3 bg-[#8A9BA8] ml-1 align-middle"
                animate={{ opacity: [1, 0] }} transition={{ duration: 0.4, repeat: Infinity, repeatType: 'reverse' }} />
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
