import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Send, Bot, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils.ts';
import { perf } from '../lib/firebase.ts';
import { trace } from 'firebase/performance';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const Assistant = () => {
  const { user, getToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'general' | 'fast' | 'search' | 'maps' | 'deep'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    
    const chatTrace = trace(perf, `assistant_chat_${mode}`);
    chatTrace.start();

    try {
      const token = await getToken();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage,
          mode: mode,
          history: messages.slice(-10) // Send last 10 messages for context
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', text: 'I am sorry, but I encountered an error connecting to my systems. Please try again later.' }]);
    } finally {
      setIsLoading(false);
      chatTrace.stop();
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 md:p-6 shadow-sm z-10 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800 flex items-center gap-2">
          <Bot className="text-blue-600" />
          Wellness Assistant
        </h1>
        <div className="mt-2 flex items-start gap-2 text-xs md:text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p>
            <strong>Disclaimer:</strong> This is an AI assistant, not a doctor or medical professional. It cannot diagnose conditions or provide medical advice. If you are in crisis, please contact emergency services.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 text-center">
            <Bot size={48} className="text-slate-300" />
            <p className="max-w-md">Hello. I am here to listen and support you. How are you feeling today?</p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={cn(
            "flex w-full",
            msg.role === 'user' ? "justify-end" : "justify-start"
          )}>
            <div className={cn(
              "max-w-[85%] md:max-w-[75%] rounded-2xl p-4 flex gap-3",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-tr-sm" 
                : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
            )}>
              {msg.role === 'model' && <Bot size={20} className="flex-shrink-0 text-blue-600 mt-0.5" />}
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm shadow-sm p-4 flex gap-3">
              <Bot size={20} className="flex-shrink-0 text-blue-600 mt-0.5 animate-pulse" />
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-slate-200 p-4 md:p-6 flex-shrink-0 mb-16 md:mb-0">
        <div className="max-w-4xl mx-auto mb-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setMode('general')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", mode === 'general' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>General Chat</button>
          <button onClick={() => setMode('fast')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", mode === 'fast' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Fast Response</button>
          <button onClick={() => setMode('search')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", mode === 'search' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Web Search</button>
          <button onClick={() => setMode('maps')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", mode === 'maps' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Find Local Places</button>
          <button onClick={() => setMode('deep')} className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors", mode === 'deep' ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>Deep Reflection</button>
        </div>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="max-w-4xl mx-auto relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center"
          >
            <Send size={18} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
