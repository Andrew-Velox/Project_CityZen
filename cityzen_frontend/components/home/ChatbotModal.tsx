import { useState } from "react";
import { createPortal } from "react-dom";

export default function ChatbotModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "bot"; content: string }[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  const CHAT_API_URL = "https://andrewvelox-gucc-rag-agent.hf.space/rag/queries/ask/";

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatError(null);
    setChatHistory((prev) => [...prev, { role: "user", content: chatInput }]);
    try {
      const res = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: chatInput }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      setChatHistory((prev) => [...prev, { role: "bot", content: data.answer || "(No response)" }]);
      setChatInput("");
    } catch (err: any) {
      setChatError("System error: Connection to agent severed.");
    } finally {
      setChatLoading(false);
    }
  };

  const clearChatHistory = () => {
    setChatHistory([]);
    setChatError(null);
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[12000] flex items-end justify-center bg-[#050505]/70 backdrop-blur-md md:items-center transition-all" 
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section className="relative flex w-full flex-col h-[100dvh] md:h-auto md:max-h-[85dvh] md:max-w-lg md:rounded-2xl border-t md:border border-cyan-500/30 bg-slate-950/90 shadow-[0_0_50px_-15px_rgba(6,182,212,0.3)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 md:zoom-in-95 duration-300">
        
        {/* Header - Glassmorphic with pulse indicator */}
        <div className="flex items-center justify-between border-b border-cyan-500/20 bg-slate-900/60 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
            </div>
            <h3 className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-xs font-black uppercase tracking-[0.2em] text-transparent">
              AI Agent Interface
            </h3>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-full bg-slate-800/50 p-2 text-cyan-500/60 transition-all hover:bg-slate-700 hover:text-cyan-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-950/40 custom-scrollbar scroll-smooth">
          {chatHistory.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center space-y-3 opacity-50">
              <svg className="h-10 w-10 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <div className="text-xs tracking-widest text-cyan-400 uppercase">System Ready</div>
            </div>
          ) : (
            chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`relative px-4 py-3 max-w-[85%] text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
                  msg.role === "user"
                    ? "bg-cyan-600/90 text-white ml-auto rounded-2xl rounded-br-sm border border-cyan-400/50"
                    : "bg-slate-800/80 text-slate-200 rounded-2xl rounded-bl-sm border border-slate-700/50"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          
          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-slate-700/50 bg-slate-800/80 px-4 py-4 text-slate-200">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500"></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500" style={{ animationDelay: "0.2s" }}></span>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-500" style={{ animationDelay: "0.4s" }}></span>
              </div>
            </div>
          )}
          {chatError && (
            <div className="text-xs font-medium tracking-wide text-red-400/90 text-center bg-red-950/30 py-2 rounded-lg border border-red-500/20">
              {chatError}
            </div>
          )}
        </div>

        {/* Input Area */}
        <form
          className="flex items-end gap-2 border-t border-cyan-500/20 bg-slate-900/80 p-4 pb-safe-4 backdrop-blur-lg"
          onSubmit={e => { e.preventDefault(); sendChatMessage(); }}
        >
          <button
            type="button"
            title="Clear chat"
            onClick={clearChatHistory}
            className="mb-1 rounded-xl p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            disabled={chatLoading}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          
          <textarea
            className="flex-1 max-h-32 min-h-[44px] resize-none rounded-xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-cyan-500/50 focus:bg-slate-950 focus:ring-2 focus:ring-cyan-500/20 scrollbar-hide"
            placeholder="Initialize query..."
            rows={1}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            disabled={chatLoading}
            onKeyDown={e => { 
              if (e.key === "Enter" && !e.shiftKey) { 
                e.preventDefault(); 
                sendChatMessage(); 
              } 
            }}
          />
          
          <button
            type="submit"
            className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 transition-all hover:scale-105 hover:shadow-cyan-500/40 disabled:pointer-events-none disabled:opacity-50"
            disabled={chatLoading || !chatInput.trim()}
          >
            {chatLoading ? (
               <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <svg className="h-5 w-5 translate-x-[-1px] translate-y-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </section>
    </div>,
    document.body
  );
}