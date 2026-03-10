'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, RefreshCcw, FileAudio } from 'lucide-react';
import { askMechanic } from '../actions';
import { springSmooth, ChatMsg } from './types';

export default function ChatTab({ credits, fetchUserData, diagnosisHistory }: {
  credits: number | null; 
  fetchUserData: () => void;
  diagnosisHistory: any[];
}) {
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isChatLoading]);

  // Provide the last diagnosis as context if any
  const lastDiagnosis = diagnosisHistory.find(d => d.machineCategory === 'Auto');
  const activeContext = lastDiagnosis 
    ? `Ostatnia diagnoza auta: ${lastDiagnosis.makeModel || 'Nieznany'}. Problem: ${lastDiagnosis.diagnosisTitle} (${lastDiagnosis.severity}).`
    : undefined;

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;
    setChatInput('');
    const updated: ChatMsg[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(updated);
    setIsChatLoading(true);

    try {
      const res = await askMechanic(updated, activeContext, diagnosisHistory);
      setChatMessages(prev => [...prev, { role: 'model', content: res.error ? res.error : (res.content ?? '…') }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', content: 'Przepraszam, wystąpił błąd połączenia.' }]);
    } finally { setIsChatLoading(false); }
  }, [chatInput, chatMessages, isChatLoading, activeContext, diagnosisHistory]);

  const resetChat = () => {
    setChatMessages([]);
    setChatInput('');
  };

  return (
    <motion.div key="chat" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      transition={springSmooth} className="absolute inset-0 flex flex-col">
      <div className="shrink-0 flex items-center justify-between px-5 pt-3 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={resetChat} className="text-[12px] text-white/40 hover:text-white/70 transition-colors flex items-center gap-1">
          <RefreshCcw className="w-3 h-3" /> Nowy Czat
        </button>
        <div className="flex flex-col items-center">
          <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1"
            style={{ background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.25)' }}>
            <MessageCircle className="w-4.5 h-4.5 text-[#00d4ff]" />
          </div>
          <p className="text-[13px] font-semibold text-white/90">AI Mechanik</p>
        </div>
        <div className="w-[84px]" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <MessageCircle className="w-10 h-10 text-white/20 mb-3" />
            <p className="text-[13px] text-white/60">Zapytaj mechanika o swój samochód</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {chatMessages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[76%] px-4 py-2.5 text-[14px] leading-[1.5] whitespace-pre-wrap ${
                msg.role === 'user' ? 'rounded-[20px] rounded-br-[6px] text-white' : 'rounded-[20px] rounded-bl-[6px] text-white/88'}`}
                style={msg.role === 'user' ? { background: '#00d4ff', color: '#000' } : { background: 'rgba(44,44,46,0.95)' }}>
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

      <div className="shrink-0 px-5 pb-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-end gap-2.5">
          <div className="flex-1 rounded-[22px] px-4 py-2.5 min-h-[44px] flex items-center"
            style={{ background: 'rgba(44,44,46,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
              placeholder="Napisz do mechanika…" disabled={isChatLoading}
              className="flex-1 bg-transparent text-[15px] text-white/85 outline-none placeholder:text-white/22 disabled:opacity-50" />
          </div>
          <motion.button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatLoading} whileTap={{ scale: 0.85 }}
            className="w-[44px] h-[44px] rounded-full flex items-center justify-center shrink-0"
            style={{ background: chatInput.trim() && !isChatLoading ? '#00d4ff' : 'rgba(255,255,255,0.08)' }}>
            <Send className={`w-4 h-4 ${chatInput.trim() && !isChatLoading ? 'text-black' : 'text-white/25'}`} style={{ transform: 'translateX(1px)' }} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
