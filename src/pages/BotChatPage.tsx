import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Smartphone,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Link2,
} from 'lucide-react';
import api from '../api/axios';
import { BotIntegrationStatus } from '../types';
import { useToast } from '../context/ToastContext';

interface BotChatPageProps {
  onRefreshFinance?: () => void;
  onNavigateToTransactions?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  platform: 'telegram' | 'whatsapp';
  transactionData?: {
    amount: number;
    type: 'income' | 'expense';
    categoryName: string;
    description: string;
  };
  budgetAlert?: {
    level: 'warning' | 'danger';
    message: string;
  } | null;
}

export const BotChatPage: React.FC<BotChatPageProps> = ({
  onRefreshFinance,
  onNavigateToTransactions,
}) => {
  const { showToast } = useToast();

  // Active platform in simulator: 'telegram' | 'whatsapp'
  const [activePlatform, setActivePlatform] = useState<'telegram' | 'whatsapp'>('telegram');

  // Integration config status from API
  const [status, setStatus] = useState<BotIntegrationStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Form inputs for connection
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [autoSetWebhook, setAutoSetWebhook] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
  const [isRegeneratingPairing, setIsRegeneratingPairing] = useState(false);

  // Copy state trackers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Chat simulator state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch status
  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await api.get('/integrations/status');
      if (res.data?.success) {
        const data: BotIntegrationStatus = res.data.data;
        setStatus(data);
        setTelegramChatId(data.telegram_chat_id || '');
        setTelegramUsername(data.telegram_username || '');
        setWhatsappPhone(data.whatsapp_phone || '');
      }
    } catch (e) {
      showToast('Gagal memuat status integrasi bot.', 'error');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Initial welcome message in simulator
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'bot',
        platform: 'telegram',
        time: timeStr,
        text:
          `👋 *Halo! Selamat datang di FinTrack Bot.*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `Anda dapat mencatat pengeluaran & pemasukan semudah mengirim chat biasa.\n\n` +
          `💡 *Coba ketik salah satu contoh ini:*\n` +
          `• _Makan siang nasi padang 25k_\n` +
          `• _Isi bensin pertamax 50rb_\n` +
          `• _+5000000 Gaji bulanan_\n` +
          `• _/saldo_ atau _/anggaran_`,
      },
    ]);
  }, []);

  // Auto scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Teks berhasil disalin ke clipboard!', 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Regenerate Pairing Code
  const handleRegeneratePairing = async (platform: 'telegram' | 'whatsapp' | 'all' = 'all') => {
    setIsRegeneratingPairing(true);
    try {
      const res = await api.post('/integrations/pairing-code', { platform });
      if (res.data?.success) {
        showToast('Kode pairing baru berhasil dibuat.', 'success');
        fetchStatus();
      }
    } catch (e) {
      showToast('Gagal membuat kode pairing baru.', 'error');
    } finally {
      setIsRegeneratingPairing(false);
    }
  };

  // Save Telegram Config
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTelegram(true);
    try {
      const res = await api.post('/integrations/telegram/config', {
        chat_id: telegramChatId,
        username: telegramUsername,
        bot_token: telegramBotToken || undefined,
        auto_set_webhook: autoSetWebhook,
      });
      if (res.data?.success) {
        showToast(res.data.message || 'Konfigurasi Telegram disimpan.', 'success');
        fetchStatus();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Gagal menyimpan Telegram.', 'error');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  // Save WhatsApp Config
  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    try {
      const res = await api.post('/integrations/whatsapp/config', {
        phone: whatsappPhone,
      });
      if (res.data?.success) {
        showToast(res.data.message || 'Nomor WhatsApp berhasil disimpan.', 'success');
        fetchStatus();
      }
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Gagal menyimpan WhatsApp.', 'error');
    } finally {
      setIsSavingWhatsApp(false);
    }
  };

  // Send message in simulator
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isSending) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: timeStr,
      platform: activePlatform,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsSending(true);

    try {
      const res = await api.post('/integrations/simulate', {
        platform: activePlatform,
        message: textToSend,
      });

      if (res.data?.success) {
        const responseData = res.data.data;
        const botReplyTime = new Date();
        const replyTimeStr = `${String(botReplyTime.getHours()).padStart(2, '0')}:${String(botReplyTime.getMinutes()).padStart(2, '0')}`;

        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: responseData.reply,
          time: replyTimeStr,
          platform: activePlatform,
          budgetAlert: responseData.budgetAlert,
          transactionData: responseData.transaction
            ? {
                amount: responseData.transaction.amount,
                type: responseData.transaction.type,
                categoryName: responseData.transaction.category?.name || 'Kategori',
                description: responseData.transaction.description,
              }
            : undefined,
        };

        setMessages((prev) => [...prev, botMsg]);

        // If a transaction was created, refresh data across the entire application!
        if (responseData.actionTaken === 'transaction_created' && onRefreshFinance) {
          onRefreshFinance();
          showToast('Transaksi tercatat & data FinTrack diperbarui!', 'success');
        }
      }
    } catch (err: any) {
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: '❌ Terjadi gangguan server saat memproses pesan.',
        time: timeStr,
        platform: activePlatform,
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const quickPrompts = [
    { label: '🍱 Nasi Padang 25k', text: 'Makan siang nasi padang 25k' },
    { label: '⛽ Bensin 50rb', text: 'Bensin Pertamax 50rb' },
    { label: '☕ Kopi 18.000', text: 'Kopi kenangan 18000' },
    { label: '⚡ Listrik 150k', text: 'Bayar token PLN 150k' },
    { label: '💼 +3.5jt Gaji', text: '+3500000 Gaji freelance' },
    { label: '📊 /saldo', text: '/saldo' },
    { label: '🎯 /anggaran', text: '/anggaran' },
    { label: '📜 /riwayat', text: '/riwayat' },
  ];

  // Helper to format text with Markdown bold and italic
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');
    return lines.map((line, idx) => {
      // Horizontal dividers
      if (line.startsWith('━')) {
        return <div key={idx} className="my-1 border-t border-slate-200/50 dark:border-slate-700/50" />;
      }

      // Convert *bold* and _italic_
      const formatted = line.split(/(\*[^*]+\*|_[^_]+_)/g).map((chunk, cIdx) => {
        if (chunk.startsWith('*') && chunk.endsWith('*')) {
          return (
            <strong key={cIdx} className="font-semibold">
              {chunk.slice(1, -1)}
            </strong>
          );
        }
        if (chunk.startsWith('_') && chunk.endsWith('_')) {
          return (
            <em key={cIdx} className="italic opacity-90">
              {chunk.slice(1, -1)}
            </em>
          );
        }
        return chunk;
      });

      return (
        <div key={idx} className={line === '' ? 'h-2' : 'min-h-[1.2em]'}>
          {formatted}
        </div>
      );
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                Pencatatan WhatsApp & Telegram
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Catat pengeluaran & pemasukan semudah mengirim chat santai ke bot favorit Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span>Telegram:</span>
            <span className="font-bold">
              {status?.is_telegram_connected ? 'Terhubung' : 'Siap Dipasangkan'}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>WhatsApp:</span>
            <span className="font-bold">
              {status?.is_whatsapp_connected ? 'Terhubung' : 'Siap Dipasangkan'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Simulator on Left/Top, Setup Hub on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: INTERACTIVE CHAT SIMULATOR (6 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[650px]">
          {/* Simulator Header */}
          <div
            className={`px-4 py-3.5 flex items-center justify-between transition-colors border-b ${
              activePlatform === 'telegram'
                ? 'bg-sky-600 text-white border-sky-700'
                : 'bg-emerald-700 text-white border-emerald-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-sm">
                {activePlatform === 'telegram' ? '✈️' : '💬'}
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <span>FinTrack Assistant Bot</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping" />
                </h3>
                <p className="text-[11px] text-white/80">
                  {activePlatform === 'telegram' ? '@FinTrackFinanceBot • online' : 'WhatsApp Official • online'}
                </p>
              </div>
            </div>

            {/* Platform Switcher */}
            <div className="flex items-center bg-black/20 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActivePlatform('telegram')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activePlatform === 'telegram'
                    ? 'bg-white text-sky-800 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Telegram
              </button>
              <button
                type="button"
                onClick={() => setActivePlatform('whatsapp')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activePlatform === 'whatsapp'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                WhatsApp
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div
            className={`flex-1 p-4 overflow-y-auto space-y-3.5 ${
              activePlatform === 'telegram'
                ? 'bg-slate-50 dark:bg-slate-950/70'
                : 'bg-[#efeae2] dark:bg-slate-950'
            }`}
          >
            <div className="text-center my-1">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-medium bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                Simulasi Live: Chat ini langsung menyimpan data ke FinTrack Anda
              </span>
            </div>

            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed ${
                      isUser
                        ? activePlatform === 'telegram'
                          ? 'bg-sky-500 text-white rounded-tr-none'
                          : 'bg-[#d9fdd3] dark:bg-emerald-900 text-slate-800 dark:text-white rounded-tr-none'
                        : activePlatform === 'telegram'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/60 dark:border-slate-700/60'
                    }`}
                  >
                    <div>{renderFormattedText(msg.text)}</div>

                    {/* Transaction Action Receipt Badge */}
                    {msg.transactionData && (
                      <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center justify-between gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersinkron ke FinTrack</span>
                        </span>
                        {onNavigateToTransactions && (
                          <button
                            onClick={onNavigateToTransactions}
                            className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                          >
                            <span>Lihat</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isUser
                          ? activePlatform === 'telegram'
                            ? 'text-white/70'
                            : 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {msg.time} {isUser && '✓✓'}
                    </div>
                  </div>
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-2">
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] italic">Bot sedang mengetik dan mencatat...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompts Carousel */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 shrink-0 mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Cepat:
            </span>
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(p.text)}
                disabled={isSending}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200 dark:border-slate-700/60"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={isSending}
              placeholder={
                activePlatform === 'telegram'
                  ? 'Ketik pesan ke bot (mis: Beli bensin 35rb)...'
                  : 'Kirim pesan WhatsApp (mis: Makan siang 25k)...'
              }
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className={`p-2 rounded-xl text-white transition-colors disabled:opacity-50 ${
                activePlatform === 'telegram'
                  ? 'bg-sky-500 hover:bg-sky-600'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: CONNECTION SETUP & INTEGRATION HUB (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Pairing Code Card */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Kode Pairing Akun Anda</span>
              </span>
              <button
                type="button"
                onClick={() => handleRegeneratePairing('all')}
                disabled={isRegeneratingPairing}
                className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                title="Buat kode baru"
              >
                <RotateCcw className={`w-3 h-3 ${isRegeneratingPairing ? 'animate-spin' : ''}`} />
                <span>Acak Baru</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Telegram Code */}
              <div className="p-3 bg-sky-50/60 dark:bg-sky-950/40 rounded-xl border border-sky-200 dark:border-sky-800">
                <span className="text-[11px] text-sky-700 dark:text-sky-300 font-medium">
                  Telegram Pairing
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-mono font-bold text-sky-900 dark:text-white">
                    {status?.telegram_pairing_code || 'FT-7291'}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(status?.telegram_pairing_code || 'FT-7291', 'tg_code')
                    }
                    className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 rounded-md transition-colors"
                    title="Salin Kode"
                  >
                    {copiedKey === 'tg_code' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* WhatsApp Code */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  WhatsApp Pairing
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-mono font-bold text-emerald-900 dark:text-white">
                    {status?.whatsapp_pairing_code || 'WA-7291'}
                  </span>
                  <button
                    onClick={() =>
                      copyToClipboard(status?.whatsapp_pairing_code || 'WA-7291', 'wa_code')
                    }
                    className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-md transition-colors"
                    title="Salin Kode"
                  >
                    {copiedKey === 'wa_code' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
              Kirimkan format <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-slate-700 dark:text-slate-300">/link KODE</code> ke bot untuk menautkan akun Anda secara instan.
            </p>
          </div>

          {/* TELEGRAM SETUP PANEL */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-500 flex items-center justify-center text-white text-xs">
                  ✈️
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Konfigurasi Telegram Bot
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  status?.is_telegram_connected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {status?.is_telegram_connected ? 'Terhubung' : 'Belum Terhubung'}
              </span>
            </div>

            <form onSubmit={handleSaveTelegram} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Telegram Chat ID / User ID
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Contoh: 123456789"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <span className="text-[10px] text-slate-400">
                  Dapatkan ID Anda dengan kirim <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/start</code> ke @userinfobot di Telegram.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Username Telegram (Opsional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400">@</span>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="username_anda"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Telegram Bot Token Pribadi (Opsional dari @BotFather)
                </label>
                <input
                  type="password"
                  value={telegramBotToken}
                  onChange={(e) => setTelegramBotToken(e.target.value)}
                  placeholder={status?.telegram_bot_token ? 'Sudah tersimpan (isi jika ingin ganti)' : '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoWebhook"
                  checked={autoSetWebhook}
                  onChange={(e) => setAutoSetWebhook(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="autoWebhook" className="text-[11px] text-slate-600 dark:text-slate-300">
                  Daftarkan Webhook FinTrack secara otomatis ke Telegram
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSavingTelegram}
                  className="flex-1 py-2 rounded-lg font-semibold text-white bg-sky-600 hover:bg-sky-700 transition-colors disabled:opacity-50 text-xs"
                >
                  {isSavingTelegram ? 'Menyimpan...' : 'Simpan Konfigurasi Telegram'}
                </button>
              </div>
            </form>

            {/* Telegram Webhook URL */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">Endpoint Webhook Telegram:</span>
              <div className="mt-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate flex-1">
                  {status?.webhook_url_telegram || 'Memuat...'}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(status?.webhook_url_telegram || '', 'tg_webhook')
                  }
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Salin Webhook URL"
                >
                  {copiedKey === 'tg_webhook' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* WHATSAPP SETUP PANEL */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-xs">
                  💬
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Konfigurasi WhatsApp Bot
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  status?.is_whatsapp_connected
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {status?.is_whatsapp_connected ? 'Terhubung' : 'Belum Terhubung'}
              </span>
            </div>

            <form onSubmit={handleSaveWhatsApp} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Nomor WhatsApp Anda
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="Contoh: 08123456789 atau +628123456789"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  Format otomatis didukung: 08..., 62..., atau +62...
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSavingWhatsApp}
                  className="flex-1 py-2 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 text-xs"
                >
                  {isSavingWhatsApp ? 'Menyimpan...' : 'Simpan Nomor WhatsApp'}
                </button>
              </div>
            </form>

            {/* Quick Click-to-Chat Link Generator */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Pencatatan Cepat via WhatsApp Web / App:
              </span>
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Makan siang 25k')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka WhatsApp dengan Template Catatan</span>
              </a>
            </div>

            {/* WhatsApp Webhook URL */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[11px] text-slate-400 font-medium">
                Endpoint Webhook WhatsApp (Twilio / Meta Cloud / Fonnte):
              </span>
              <div className="mt-1 flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate flex-1">
                  {status?.webhook_url_whatsapp || 'Memuat...'}
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(status?.webhook_url_whatsapp || '', 'wa_webhook')
                  }
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Salin Webhook URL"
                >
                  {copiedKey === 'wa_webhook' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SYNTAX & COMMANDS CHEAT SHEET */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            Panduan Lengkap Format Pesan & Perintah Bot
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Expenses */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <span>🔴 Mencatat Pengeluaran</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Tulis nama pengeluaran diikuti nominal uang. Singkatan otomatis dikenali:
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                Makan siang nasi padang 25k
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                Bensin Pertamax 50rb
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                Beli token PLN 150.000
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                -35000 Kopi kenangan
              </li>
            </ul>
          </div>

          {/* Incomes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>🟢 Mencatat Pemasukan</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Gunakan tanda plus (+) atau kata kunci pemasukan (gaji, bonus, freelance, dividen):
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                +5000000 Gaji bulanan
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                Bonus proyek freelance 1.5jt
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                Hadiah ulang tahun 250k
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                Dividen saham 850000
              </li>
            </ul>
          </div>

          {/* Bot Commands */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <span>⚡ Perintah Cepat Bot</span>
            </span>
            <p className="text-slate-500 dark:text-slate-400 text-[11px]">
              Ketik perintah di bawah untuk memantau keuangan instan tanpa membuka dashboard:
            </p>
            <ul className="space-y-1 font-mono text-[11px] text-slate-700 dark:text-slate-200">
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 flex justify-between">
                <span className="font-bold text-sky-600 dark:text-sky-400">/saldo</span>
                <span className="text-slate-400">Arus kas bulan ini</span>
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 flex justify-between">
                <span className="font-bold text-sky-600 dark:text-sky-400">/anggaran</span>
                <span className="text-slate-400">Cek batas & peringatan</span>
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 flex justify-between">
                <span className="font-bold text-sky-600 dark:text-sky-400">/riwayat</span>
                <span className="text-slate-400">5 transaksi terakhir</span>
              </li>
              <li className="bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-100 dark:border-slate-700 flex justify-between">
                <span className="font-bold text-sky-600 dark:text-sky-400">/bantuan</span>
                <span className="text-slate-400">Panduan lengkap</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
