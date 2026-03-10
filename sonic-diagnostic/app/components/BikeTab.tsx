'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Send, RefreshCcw, Wrench, ChevronDown } from 'lucide-react';
import { analyzeBikeFault, askBikeMechanic } from '../actions';
import { springBouncy, springSmooth, ChatMsg, BIKE_TYPES, BIKE_COMPONENTS } from './types';

export default function BikeTab({ credits, onNeedCredits, fetchUserData }: {
  credits: number | null; onNeedCredits: () => void; fetchUserData: () => void;
}) {
  const [state, setState] = useState<'form' | 'processing' | 'chat'>('form');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [context, setContext] = useState('');
  const [bikeType, setBikeType] = useState('');
  const [component, setComponent] = useState('');
  const [result, setResult] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showBikeTypeDropdown, setShowBikeTypeDropdown] = useState(false);
  const [showComponentDropdown, setShowComponentDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatLoading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAnalyze = async () => {
    if (!uploadedFile) return;
    if (credits !== null && credits < 1) { onNeedCredits(); return; }
    setState('processing');
    const fd = new FormData();
    fd.append('file', uploadedFile);
    fd.append('context', context);
    fd.append('bikeType', bikeType);
    fd.append('component', component);
    const res = await analyzeBikeFault(fd);
    if (res?.error === 'OUT_OF_CREDITS') { onNeedCredits(); setState('form'); return; }
    setResult(res);
    if (res && !res.error) {
      setChatMessages([{ role: 'model', content: formatBikeResponse(res) }]);
      if (res.chat_opener) setChatMessages(prev => [...prev, { role: 'model', content: res.chat_opener }]);
    }
    setState('chat');
    fetchUserData();
  };

  const formatBikeResponse = (r: any) => {
    let msg = `🔧 **${r.diagnosis_title}**\n\n`;
    msg += `${r.diagnosis_details}\n\n`;
    if (r.repair_instructions) msg += `📋 **Instrukcja naprawy:**\n${r.repair_instructions}\n\n`;
    if (r.tools_needed) msg += `🛠 **Narzędzia:** ${r.tools_needed}\n\n`;
    if (r.estimated_cost) msg += `💰 **Koszt części:** ${r.estimated_cost}\n`;
    if (r.diy_possible !== undefined) msg += `${r.diy_possible ? '✅ Możliwa naprawa samodzielna' : '⚠️ Zalecany serwis rowerowy'}`;
    return msg;
  };

  const activeContext = result
    ? `Rower: ${bikeType}. Komponent: ${component}. Opis: ${context}. Diagnoza: ${result.diagnosis_title} (${result.severity}, ${result.confidence_score}%). Naprawa: ${result.repair_instructions}`
    : undefined;

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;
    if (chatMessages.length >= 20) return;
    setChatInput('');
    const updated: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(updated);
    setIsChatLoading(true);
    try {
      const res = await askBikeMechanic(updated, activeContext);
      if (res.error === 'LIMIT_REACHED') {
        setChatMessages(prev => [...prev, { role: 'model', content: res.content || 'Limit wiadomości osiągnięty.' }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'model', content: res.error ? res.error : (res.content ?? '…') }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Przepraszam, wystąpił błąd połączenia.' }]);
    } finally { setIsChatLoading(false); }
  }, [chatInput, chatMessages, isChatLoading, activeContext]);

  const resetBike = () => {
    setState('form'); setResult(null); setUploadedFile(null); setPreviewUrl(null);
    setContext(''); setChatMessages([]); setChatInput('');
  };

  const limitReached = chatMessages.length >= 20;

  if (state === 'processing') {
    return (
      <motion.div key="bike-proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div className="w-16 h-16 rounded-full" style={{ border: '2px solid rgba(34,197,94,0.15)', borderTopColor: '#22c55e' }}
          animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
        <p className="text-[15px] text-white/60 mt-6 font-medium">Analizuję zdjęcie roweru…</p>
        <p className="text-[12px] text-white/30 mt-2">Mechanik AI przygotowuje diagnozę</p>
      </motion.div>
    );
  }

  if (state === 'chat') {
    return (
      <motion.div key="bike-chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col">
        {/* Chat header */}
        <div className="shrink-0 flex items-center justify-between px-4 pt-2 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={resetBike} className="text-[12px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
            <RefreshCcw className="w-3 h-3" /> Nowa diagnoza
          </button>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)' }}>
              <Wrench className="w-4 h-4 text-[#22c55e]" />
            </div>
            <p className="text-[12px] font-semibold text-white/80">Serwisant AI</p>
          </div>
          <div className="w-16" />
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          <AnimatePresence initial={false}>
            {chatMessages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[76%] px-4 py-2.5 text-[14px] leading-[1.5] whitespace-pre-wrap ${
                  msg.role === 'user' ? 'rounded-[20px] rounded-br-[6px] text-white' : 'rounded-[20px] rounded-bl-[6px] text-white/88'}`}
                  style={msg.role === 'user' ? { background: '#16a34a' } : { background: 'rgba(44,44,46,0.95)' }}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isChatLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="px-4 py-3 rounded-[20px] rounded-bl-[6px] flex items-center gap-1" style={{ background: 'rgba(44,44,46,0.95)' }}>
                {[0, 0.2, 0.4].map((d) => (
                  <motion.div key={d} className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 1.2, delay: d }} />
                ))}
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>
        {/* Input */}
        <div className="shrink-0 px-4 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {limitReached ? (
            <p className="text-center text-[12px] text-white/35 py-3">Limit 20 wiadomości — zacznij nową diagnozę</p>
          ) : (
            <div className="flex items-end gap-2.5">
              <div className="flex-1 rounded-[22px] px-4 py-2.5 min-h-[44px] flex items-center"
                style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  placeholder="Zapytaj serwisanta…" disabled={isChatLoading}
                  className="flex-1 bg-transparent text-[15px] text-white/85 outline-none placeholder:text-white/22 disabled:opacity-50" />
              </div>
              <motion.button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatLoading} whileTap={{ scale: 0.85 }}
                className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
                style={{ background: chatInput.trim() && !isChatLoading ? '#16a34a' : 'rgba(255,255,255,0.08)' }}>
                <Send className={`w-4 h-4 ${chatInput.trim() && !isChatLoading ? 'text-white' : 'text-white/25'}`} style={{ transform: 'translateX(1px)' }} />
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // FORM state
  return (
    <motion.div key="bike-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }} className="absolute inset-0 overflow-y-auto">
      <div className="px-5 pt-3 pb-8 space-y-4">
        <motion.h2 className="text-[22px] font-bold text-white" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          Diagnostyka Roweru
        </motion.h2>
        <p className="text-[13px] text-white/45 -mt-2">Prześlij zdjęcie lub wideo usterki</p>

        {/* Upload area */}
        <input type="file" accept="image/*,video/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
        {previewUrl ? (
          <div className="relative rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(34,197,94,0.2)' }}>
            {uploadedFile?.type.startsWith('video') ? (
              <video src={previewUrl} className="w-full h-48 object-cover" controls />
            ) : (
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
            )}
            <button onClick={() => { setUploadedFile(null); setPreviewUrl(null); }}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)' }}>
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
        ) : (
          <motion.button onClick={() => fileInputRef.current?.click()} whileTap={{ scale: 0.98 }}
            className="w-full py-12 rounded-2xl flex flex-col items-center gap-3 transition-all"
            style={{ background: 'rgba(34,197,94,0.04)', border: '1px dashed rgba(34,197,94,0.25)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Camera className="w-7 h-7 text-[#22c55e]/70" />
            </div>
            <p className="text-[13px] text-white/50">Zdjęcie lub wideo usterki</p>
            <p className="text-[11px] text-white/25">JPG, PNG, MP4, MOV</p>
          </motion.button>
        )}

        {/* Bike type */}
        <div>
          <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Typ roweru</label>
          <div className="relative">
            <button onClick={() => { setShowBikeTypeDropdown(!showBikeTypeDropdown); setShowComponentDropdown(false); }}
              className="w-full text-left text-[14px] rounded-xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: bikeType ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.28)' }}>
              {bikeType || 'Wybierz typ…'}
              <ChevronDown className="w-4 h-4 text-white/30" />
            </button>
            <AnimatePresence>
              {showBikeTypeDropdown && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                  style={{ background: 'rgba(15,25,35,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {BIKE_TYPES.map(t => (
                    <button key={t} onClick={() => { setBikeType(t); setShowBikeTypeDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-[13px] text-white/70 hover:bg-white/5 transition-colors">{t}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Component */}
        <div>
          <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Komponent</label>
          <div className="relative">
            <button onClick={() => { setShowComponentDropdown(!showComponentDropdown); setShowBikeTypeDropdown(false); }}
              className="w-full text-left text-[14px] rounded-xl p-4 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: component ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.28)' }}>
              {component || 'Wybierz komponent…'}
              <ChevronDown className="w-4 h-4 text-white/30" />
            </button>
            <AnimatePresence>
              {showComponentDropdown && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                  style={{ background: 'rgba(15,25,35,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {BIKE_COMPONENTS.map(c => (
                    <button key={c} onClick={() => { setComponent(c); setShowComponentDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-[13px] text-white/70 hover:bg-white/5 transition-colors">{c}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Context */}
        <div>
          <label className="text-[10px] text-white/48 uppercase tracking-[0.12em] mb-2 block font-bold">Opis usterki</label>
          <textarea placeholder="np. Łańcuch przeskakuje przy mocnym pedałowaniu, szczególnie na 3 i 4 biegu…"
            value={context} onChange={(e) => setContext(e.target.value)}
            className="w-full text-[14px] text-white/88 rounded-xl p-4 h-24 outline-none resize-none placeholder:text-white/28 input-glow"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        {/* Analyze button */}
        <motion.button onClick={handleAnalyze} disabled={!uploadedFile} whileTap={{ scale: 0.98 }}
          className="w-full font-bold py-4 rounded-2xl text-[14px] transition-all disabled:opacity-30"
          style={{ background: uploadedFile ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(0,100,50,0.15))' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${uploadedFile ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.06)'}`, color: 'rgba(255,255,255,0.9)' }}>
          🔧 Zdiagnozuj Rower
        </motion.button>
      </div>
    </motion.div>
  );
}
