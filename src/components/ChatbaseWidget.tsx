import React, { useState, useEffect } from 'react';
import { MessageSquare, X, Settings, ExternalLink, Bot, Check, Sparkles, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatbaseWidgetProps {
  initialChatbotUrl?: string;
}

export const ChatbaseWidget: React.FC<ChatbaseWidgetProps> = ({
  initialChatbotUrl = 'https://www.chatbase.co/chatbot-iframe/ES5BPG2Jh5vLqCvItIFCY'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Load saved Chatbase URL/ID from localStorage or use default
  const [chatbotUrl, setChatbotUrl] = useState<string>(() => {
    return localStorage.getItem('chatbase_url') || initialChatbotUrl;
  });
  const [inputUrl, setInputUrl] = useState(chatbotUrl);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyDomain = () => {
    if (navigator.clipboard && currentDomain) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  // Extract clean iframe src from user input (supports pasting full <iframe ...> tag or raw URL)
  const formatIframeUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    
    // If user pasted full iframe tag: <iframe src="https://www.chatbase.co/chatbot-iframe/..." ...
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1];
    }
    
    // If user entered only chatbot ID (e.g. ES5Bxxxx)
    if (!trimmed.startsWith('http')) {
      return `https://www.chatbase.co/chatbot-iframe/${trimmed}`;
    }
    
    return trimmed;
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = formatIframeUrl(inputUrl);
    setChatbotUrl(formatted);
    localStorage.setItem('chatbase_url', formatted);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    setShowSettings(false);
  };

  const currentIframeSrc = formatIframeUrl(chatbotUrl);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="pointer-events-auto bg-zinc-900 text-white text-xs font-medium px-3.5 py-1.5 rounded-full shadow-lg border border-zinc-700/50 flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>線上 AI 客服</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="pointer-events-auto relative group bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white p-4 rounded-full shadow-2xl shadow-blue-500/30 border border-white/20 flex items-center justify-center transition-all"
          aria-label="開啟 AI 客服"
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </>
          )}
        </motion.button>
      </div>

      {/* Chatbot Window Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[650px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-zinc-900 text-white px-5 py-4 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    微碧 AI 客服
                    <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full font-mono border border-blue-400/30">Chatbase</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    即時線上解答疑問
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {currentIframeSrc && (
                  <>
                    <button
                      onClick={handleReload}
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                      title="重新載入客服"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <a
                      href={currentIframeSrc}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                      title="在新分頁開啟 Chatbase"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </>
                )}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-xl transition-colors ${showSettings ? 'bg-zinc-800 text-blue-400' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  title="Chatbase 設定"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
                  title="關閉"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="relative flex-1 bg-zinc-50 overflow-hidden">
              {showSettings ? (
                <div className="p-6 h-full overflow-y-auto bg-white space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-zinc-900 font-bold text-base">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      Chatbase 客服設定
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      請在下方貼上您從 Chatbase 取得的 <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-800">&lt;iframe&gt;</span> 程式碼、Iframe URL 或 Chatbot ID。
                    </p>
                  </div>

                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-700">
                        Chatbase Iframe 網址或完整程式碼
                      </label>
                      <textarea
                        rows={4}
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        placeholder='例如: <iframe src="https://www.chatbase.co/chatbot-iframe/..." ...></iframe> 或直接貼上網址'
                        className="w-full text-xs font-mono p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-800 space-y-2">
                      <div className="font-bold flex items-center justify-between">
                        <span>⚠️ 若出現「拒絕連線」解決方法：</span>
                      </div>
                      <div className="text-[11px] leading-relaxed space-y-1 text-amber-900">
                        <p>1. 進入 Chatbase 後台的 <span className="font-semibold">「Website iframe」</span> 設定。</p>
                        <p>2. 將 <span className="font-semibold">「Only allow embedding on specific domains」</span> 開關<span className="text-red-600 font-bold">關閉</span>，或是新增下方目前的網域：</p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          readOnly
                          value={currentDomain}
                          className="flex-1 text-[10px] font-mono p-1.5 bg-white border border-amber-300 rounded-lg text-amber-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyDomain}
                          className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 whitespace-nowrap"
                        >
                          {copiedDomain ? <Check className="w-3 h-3 text-emerald-300" /> : null}
                          {copiedDomain ? '已複製' : '複製網域'}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            已儲存成功
                          </>
                        ) : (
                          '儲存並套用'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSettings(false)}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                </div>
              ) : currentIframeSrc ? (
                <div className="w-full h-full flex flex-col">
                  <iframe
                    key={reloadKey}
                    src={currentIframeSrc}
                    className="w-full flex-1 border-none"
                    title="Chatbase AI 客服"
                    allow="microphone"
                  />
                  <div className="bg-zinc-100 border-t border-zinc-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-zinc-600">
                    <span className="truncate max-w-[220px]">若顯示「拒絕連線」：</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-blue-600 font-bold hover:underline"
                      >
                        網域設定
                      </button>
                      <span className="text-zinc-300">|</span>
                      <a
                        href={currentIframeSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-bold hover:underline flex items-center gap-0.5"
                      >
                        直接開啟
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-900">尚未設定 Chatbase AI 客服</h4>
                    <p className="text-xs text-zinc-500">點擊下方按鈕貼上您的 Chatbot ID 或 Iframe 網址。</p>
                  </div>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Settings className="w-4 h-4" />
                    立即設定 Chatbot
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
