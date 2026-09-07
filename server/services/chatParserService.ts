import { Category, Transaction, Budget } from '../models/index';
import { Op } from 'sequelize';

export interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  category_name: string;
  category_color?: string;
  category_icon?: string;
  description: string;
  date: string;
}

export interface ParseResult {
  isCommand: boolean;
  command?: string;
  argument?: string;
  transaction?: ParsedTransaction;
  error?: string;
}

export interface ProcessChatResponse {
  reply: string;
  success: boolean;
  actionTaken?: 'transaction_created' | 'linked' | 'query' | 'help' | 'error';
  transaction?: any & { category?: any };
  budgetAlert?: {
    categoryName: string;
    spent: number;
    budgetAmount: number;
    percentage: number;
    level: 'warning' | 'danger';
    message: string;
  } | null;
}

// Category keyword mappings for Indonesian financial queries
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Makanan & Minuman': [
    'makan', 'sarapan', 'siang', 'malam', 'dinner', 'lunch', 'breakfast',
    'kopi', 'coffee', 'cafe', 'kafe', 'nasi', 'padang', 'goreng', 'bakso',
    'mie', 'ayam', 'sate', 'boba', 'jajan', 'snack', 'cemilan', 'resto',
    'restoran', 'warteg', 'indomaret', 'alfamart', 'mcd', 'kfc', 'starbucks',
    'gacoan', 'roti', 'kue', 'minum', 'jus', 'teh', 'es', 'kantin', 'catering'
  ],
  'Transportasi': [
    'bensin', 'pertalite', 'pertamax', 'solar', 'shell', 'spbu', 'gojek',
    'goride', 'gocar', 'grab', 'grabfood', 'maxim', 'ojol', 'ojek', 'taksi',
    'taxi', 'tol', 'etoll', 'e-toll', 'parkir', 'kereta', 'krl', 'mrt', 'lrt',
    'bus', 'busway', 'transjakarta', 'tj', 'angkot', 'pesawat', 'tiket',
    'servis', 'bengkel', 'oli', 'cuci motor', 'cuci mobil', 'ban'
  ],
  'Tagihan & Utilitas': [
    'listrik', 'pln', 'token', 'pdam', 'air', 'wifi', 'indihome', 'biznet',
    'firstmedia', 'myrepublic', 'pulsa', 'kuota', 'paket data', 'telkomsel',
    'indosat', 'xl', 'tri', 'smartfren', 'bpjs', 'gas', 'iuran', 'kebersihan',
    'keamanan', 'langganan', 'subscription'
  ],
  'Tempat Tinggal': [
    'kos', 'kosan', 'kontrakan', 'sewa', 'apartemen', 'ipl', 'pbb',
    'cicilan rumah', 'kpr', 'renovasi', 'genteng', 'cat', 'furniture'
  ],
  'Kesehatan & Medis': [
    'obat', 'apotek', 'k24', 'kimia farma', 'dokter', 'rs', 'rumah sakit',
    'klinik', 'puskesmas', 'vitamin', 'suplemen', 'dental', 'gigi', 'mata',
    'kacamata', 'gym', 'fitness', 'olahraga', 'fisioterapi', 'lab', 'darah'
  ],
  'Belanja & Hiburan': [
    'belanja', 'baju', 'kaos', 'celana', 'sepatu', 'tas', 'jaket', 'shopee',
    'tokopedia', 'lazada', 'tiktok', 'mall', 'nonton', 'bioskop', 'cinema',
    'xxi', 'cgv', 'game', 'steam', 'playstation', 'topup game', 'diamond',
    'spotify', 'netflix', 'youtube', 'disney', 'wisata', 'liburan', 'hotel'
  ],
  'Pendidikan': [
    'buku', 'novel', 'alat tulis', 'kursus', 'les', 'spp', 'kuliah', 'kampus',
    'sekolah', 'ujian', 'seminar', 'webinar', 'bootcamp', 'udemy', 'sertifikasi'
  ],
  'Tabungan & Dana Darurat': [
    'tabungan', 'nabung', 'investasi', 'reksadana', 'bibit', 'bareksa',
    'ajaib', 'stockbit', 'saham', 'crypto', 'bitcoin', 'deposito', 'emas',
    'antam', 'dana darurat'
  ],
  'Gaji Pokok': [
    'gaji', 'salary', 'payroll', 'upah', 'gajian', 'honor'
  ],
  'Freelance & Bisnis': [
    'freelance', 'proyek', 'project', 'klien', 'client', 'jasa', 'omset',
    'penjualan', 'toko', 'warung', 'profit', 'laba', 'desain', 'coding', 'web'
  ],
  'Hadiah & Bonus': [
    'hadiah', 'bonus', 'thr', 'angpao', 'cashback', 'reward', 'giveaway',
    'untung', 'komisi', 'tips', 'tip'
  ],
};

const INCOME_KEYWORDS = [
  'gaji', 'bonus', 'thr', 'hadiah', 'freelance', 'honor', 'dividen',
  'investasi', 'penjualan', 'omset', 'laba', 'profit', 'cair', 'dapat',
  'terima', 'pemasukan', 'income', 'masuk', 'transfer masuk', 'cashback'
];

export function formatRupiah(amount: number): string {
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

/**
 * Parses numeric currency values from natural language text
 * e.g. "25k", "25rb", "25ribu", "1.5jt", "1.5juta", "Rp 25.000", "50000"
 */
export function extractAmount(text: string): { amount: number; matchedText: string } | null {
  // 1. Check for million units: 1.5jt, 2jt, 5juta, 10.5jt
  const jtRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:jt|juta|m)(?!\w)/i;
  const jtMatch = text.match(jtRegex);
  if (jtMatch) {
    const rawNum = jtMatch[1].replace(',', '.');
    const amount = Math.round(parseFloat(rawNum) * 1000000);
    return { amount, matchedText: jtMatch[0] };
  }

  // 2. Check for thousand units: 25k, 50rb, 100ribu, 15.5k
  const kRegex = /(?:rp\.?\s*)?(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu)(?!\w)/i;
  const kMatch = text.match(kRegex);
  if (kMatch) {
    const rawNum = kMatch[1].replace(',', '.');
    const amount = Math.round(parseFloat(rawNum) * 1000);
    return { amount, matchedText: kMatch[0] };
  }

  // 3. Check for formatted standard number: Rp 25.000, 25.000, 1.500.000, 25000
  const stdRegex = /(?:rp\.?\s*)?(\d{1,3}(?:[.]\d{3})+(?:,\d+)?|\d{4,})(?!\w)/i;
  const stdMatch = text.match(stdRegex);
  if (stdMatch) {
    const cleanDigits = stdMatch[1].replace(/\./g, '').replace(',', '.');
    const amount = Math.round(parseFloat(cleanDigits));
    if (!isNaN(amount) && amount > 0) {
      return { amount, matchedText: stdMatch[0] };
    }
  }

  // 4. Smaller numbers without units (e.g. "beli martabak 500")
  const smallRegex = /(?:rp\.?\s*)(\d+)(?!\w)/i;
  const smallMatch = text.match(smallRegex);
  if (smallMatch) {
    const amount = parseInt(smallMatch[1], 10);
    if (!isNaN(amount) && amount > 0) {
      return { amount, matchedText: smallMatch[0] };
    }
  }

  return null;
}

/**
 * Intelligent categorization and transaction parser
 */
export function parseFinancialMessage(text: string, categories: any[]): ParseResult {
  const trimmed = text.trim();

  // Check for commands
  if (trimmed.startsWith('/') || trimmed.startsWith('!')) {
    const parts = trimmed.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const argument = parts.slice(1).join(' ').trim();
    return {
      isCommand: true,
      command,
      argument,
    };
  }

  // Check for plain text commands (e.g. "saldo", "cek saldo", "bantuan", "help", "anggaran", "riwayat")
  const lower = trimmed.toLowerCase();
  if (lower === 'saldo' || lower === 'cek saldo' || lower === 'lihat saldo') {
    return { isCommand: true, command: 'saldo' };
  }
  if (lower === 'anggaran' || lower === 'cek anggaran' || lower === 'cek budget' || lower === 'budget') {
    return { isCommand: true, command: 'anggaran' };
  }
  if (lower === 'riwayat' || lower === 'history' || lower === 'transaksi terakhir') {
    return { isCommand: true, command: 'riwayat' };
  }
  if (lower === 'kategori' || lower === 'daftar kategori') {
    return { isCommand: true, command: 'kategori' };
  }
  if (lower === 'help' || lower === 'bantuan' || lower === 'cara pakai' || lower === 'panduan') {
    return { isCommand: true, command: 'help' };
  }

  // Transaction parsing: Extract amount
  const extracted = extractAmount(trimmed);
  if (!extracted) {
    return {
      isCommand: false,
      error: 'Nominal uang tidak terdeteksi. Contoh format: "Makan siang 25k", "Bensin 50rb", atau "+5000000 Gaji".',
    };
  }

  const { amount, matchedText } = extracted;

  // Determine type: income or expense
  let type: 'income' | 'expense' = 'expense';
  if (trimmed.startsWith('+')) {
    type = 'income';
  } else if (trimmed.startsWith('-')) {
    type = 'expense';
  } else {
    // Check keyword clues
    const hasIncomeWord = INCOME_KEYWORDS.some((kw) => lower.includes(kw));
    if (hasIncomeWord) {
      type = 'income';
    }
  }

  // Extract description: remove the amount part and clean common filler words
  let cleanDesc = trimmed.replace(matchedText, ' ').replace(/^[+\-]/, '').trim();
  // Clean punctuation and double spaces
  cleanDesc = cleanDesc.replace(/\s+/g, ' ');
  if (!cleanDesc) {
    cleanDesc = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
  }

  // Categorization
  const lowerDesc = cleanDesc.toLowerCase();
  let matchedCat: any | undefined;

  // 1. Try keyword matching against CATEGORY_KEYWORDS
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const isMatched = keywords.some((kw) => lowerDesc.includes(kw) || lower.includes(kw));
    if (isMatched) {
      const found = categories.find((c) => c.name.toLowerCase() === catName.toLowerCase());
      if (found) {
        matchedCat = found;
        break;
      }
    }
  }

  // 2. If not matched yet, check against custom user category names directly
  if (!matchedCat) {
    matchedCat = categories.find(
      (c) => c.type === type && lowerDesc.includes(c.name.toLowerCase())
    );
  }

  // 3. Fallback to appropriate default category
  if (!matchedCat) {
    if (type === 'income') {
      matchedCat =
        categories.find((c) => c.type === 'income' && c.name.includes('Gaji')) ||
        categories.find((c) => c.type === 'income') ||
        categories[0];
    } else {
      matchedCat =
        categories.find((c) => c.type === 'expense' && c.name.includes('Makanan')) ||
        categories.find((c) => c.type === 'expense') ||
        categories[0];
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return {
    isCommand: false,
    transaction: {
      amount,
      type,
      category_id: matchedCat.id,
      category_name: matchedCat.name,
      category_color: matchedCat.color,
      category_icon: matchedCat.icon,
      description: cleanDesc,
      date: today,
    },
  };
}

/**
 * Processes incoming chat message for a user and creates real database transactions
 */
export async function handleIncomingChatMessage({
  platform,
  text,
  user,
}: {
  platform: 'telegram' | 'whatsapp';
  text: string;
  user: any;
}): Promise<ProcessChatResponse> {
  const userCategories = await Category.findAll({
    where: { [Op.or]: [{ user_id: user.id }, { user_id: null }] },
    raw: true
  });

  const parsed = parseFinancialMessage(text, userCategories as any);

  // 1. Handle Commands
  if (parsed.isCommand && parsed.command) {
    const cmd = parsed.command;

    if (cmd === 'start' || cmd === 'help' || cmd === 'bantuan') {
      const platformName = platform === 'telegram' ? 'Telegram' : 'WhatsApp';
      const reply =
        `👋 *Selamat datang di FinTrack Bot (${platformName})!*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `Catat pengeluaran & pemasukan semudah mengirim chat biasa.\n\n` +
        `📝 *Contoh Format Pencatatan:*\n` +
        `• _Makan siang nasi padang 25k_\n` +
        `• _Isi bensin pertamax 50rb_\n` +
        `• _Beli token listrik PLN 150.000_\n` +
        `• _Kopi kenangan 18k_\n` +
        `• _+5000000 Gaji bulanan_\n` +
        `• _Bonus proyek freelance 1.5jt_\n\n` +
        `⚡ *Perintah Cepat Tersedia:*\n` +
        `• */saldo* - Ringkasan saldo & arus kas bulan ini\n` +
        `• */anggaran* - Cek capaian batas anggaran & peringatan\n` +
        `• */riwayat* - 5 transaksi terakhir Anda\n` +
        `• */kategori* - Daftar kategori yang tersedia\n` +
        `• */bantuan* - Menampilkan pesan panduan ini\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Cobalah ketik "Makan siang 25k" sekarang!_`;

      return { reply, success: true, actionTaken: 'help' };
    }

    if (cmd === 'saldo') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const monthPrefix = `${currentYear}-${pad(currentMonth)}`;

      const totalIncome = (await Transaction.sum('amount', { where: { user_id: user.id, type: 'income' } })) || 0;
      const totalExpense = (await Transaction.sum('amount', { where: { user_id: user.id, type: 'expense' } })) || 0;
      const monthIncome = (await Transaction.sum('amount', { where: { user_id: user.id, type: 'income', date: { [Op.startsWith]: monthPrefix } } })) || 0;
      const monthExpense = (await Transaction.sum('amount', { where: { user_id: user.id, type: 'expense', date: { [Op.startsWith]: monthPrefix } } })) || 0;

      const totalBalance = totalIncome - totalExpense;
      const monthNet = monthIncome - monthExpense;
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[now.getMonth()];

      const reply =
        `📊 *Ringkasan Keuangan FinTrack*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Pengguna*: ${user.name}\n` +
        `💰 *Total Saldo Bersih*: *${formatRupiah(totalBalance)}*\n\n` +
        `📅 *Bulan Berjalan (${monthName} ${currentYear})*:\n` +
        `🟢 Pemasukan: *+${formatRupiah(monthIncome)}*\n` +
        `🔴 Pengeluaran: *-${formatRupiah(monthExpense)}*\n` +
        `⚖️ Arus Kas Bersih: *${formatRupiah(monthNet)}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Ketik */anggaran* untuk memantau batas pengeluaran kategori!_`;

      return { reply, success: true, actionTaken: 'query' };
    }

    if (cmd === 'anggaran' || cmd === 'budget') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const monthPrefix = `${currentYear}-${pad(currentMonth)}`;

      const userBudgets = await Budget.findAll({
        where: { user_id: user.id, month: currentMonth, year: currentYear }
      });

      if (userBudgets.length === 0) {
        return {
          reply:
            `🎯 *Anggaran FinTrack*\n━━━━━━━━━━━━━━━━━━━\n` +
            `Belum ada batas anggaran yang ditetapkan untuk bulan ini.\n\n` +
            `Silakan buka menu *Budgets* atau *Categories* di aplikasi web FinTrack untuk mengatur target pengeluaran.`,
          success: true,
          actionTaken: 'query',
        };
      }

      let budgetLines: string[] = [];
      for (const b of userBudgets) {
        const cat = userCategories.find((c: any) => c.id === b.category_id);
        const spent = (await Transaction.sum('amount', {
          where: {
            user_id: user.id,
            category_id: b.category_id,
            type: 'expense',
            date: { [Op.startsWith]: monthPrefix }
          }
        })) || 0;

        const pct = Math.round((spent / Number(b.amount)) * 100);
        let iconStatus = '🟢';
        if (pct >= 100) iconStatus = '🔴';
        else if (pct >= (b.alert_threshold || 80)) iconStatus = '🟡';

        budgetLines.push(
          `${iconStatus} *${cat?.name || 'Kategori'}*: ${pct}%\n` +
          `   Terpakai: ${formatRupiah(spent)} / ${formatRupiah(Number(b.amount))}`
        );
      }

      const reply =
        `🎯 *Status Anggaran Bulan Ini*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        budgetLines.join('\n\n') +
        `\n━━━━━━━━━━━━━━━━━━━\n` +
        `Keterangan:\n🟢 Aman (<80%) | 🟡 Waspada (80%+) | 🔴 Melampaui (100%+)`;

      return { reply, success: true, actionTaken: 'query' };
    }

    if (cmd === 'riwayat' || cmd === 'history') {
      const userTxs = await Transaction.findAll({
        where: { user_id: user.id },
        order: [['date', 'DESC']],
        limit: 5,
        include: [{ model: Category, as: 'category' }]
      });

      if (userTxs.length === 0) {
        return {
          reply: `📜 *Riwayat Transaksi*\n━━━━━━━━━━━━━━━━━━━\nBelum ada transaksi yang tercatat.`,
          success: true,
          actionTaken: 'query',
        };
      }

      const txLines = userTxs.map((t, idx) => {
        const plain = t.get({plain:true});
        const cat = plain.category;
        const sign = t.type === 'income' ? '+ ' : '- ';
        const emoji = t.type === 'income' ? '🟢' : '🔴';
        return `${idx + 1}. ${emoji} *${t.description}*\n   ${sign}${formatRupiah(Number(t.amount))} (${cat?.name || 'Kategori'}) 📅 ${t.date}`;
      });

      const reply =
        `📜 *5 Transaksi Terakhir Anda*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        txLines.join('\n\n') +
        `\n━━━━━━━━━━━━━━━━━━━\n` +
        `💡 _Ketik */saldo* untuk melihat arus kas total._`;

      return { reply, success: true, actionTaken: 'query' };
    }

    if (cmd === 'kategori') {
      const expenseCats = userCategories.filter((c: any) => c.type === 'expense').map((c: any) => c.name);
      const incomeCats = userCategories.filter((c: any) => c.type === 'income').map((c: any) => c.name);

      const reply =
        `🏷️ *Daftar Kategori FinTrack*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `🔴 *Pengeluaran:*\n` +
        expenseCats.map((c: any) => `• ${c}`).join('\n') +
        `\n\n🟢 *Pemasukan:*\n` +
        incomeCats.map((c: any) => `• ${c}`).join('\n') +
        `\n━━━━━━━━━━━━━━━━━━━\n` +
        `Bot akan otomatis mencocokkan kata kunci Anda dengan kategori di atas!`;

      return { reply, success: true, actionTaken: 'query' };
    }
  }

  if (parsed.error || !parsed.transaction) {
    return {
      reply:
        `❌ *Pesan Tidak Dikenali*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `${parsed.error || 'Format pencatatan tidak dikenali.'}\n\n` +
        `💡 *Contoh yang dapat Anda coba:*\n` +
        `• _Makan siang 25k_\n` +
        `• _Bensin Pertalite 50000_\n` +
        `• _+2500000 Gaji freelance_\n` +
        `• Ketik */bantuan* untuk panduan lengkap.`,
      success: false,
      actionTaken: 'error',
    };
  }

  const txData = parsed.transaction;

  const newTx = await Transaction.create({
    user_id: user.id,
    category_id: txData.category_id,
    amount: txData.amount,
    description: txData.description,
    date: txData.date,
    type: txData.type,
    is_recurring: false,
    recurring_interval: null,
    currency: user.base_currency || 'IDR',
    exchange_rate: 1.0,
  });

  let budgetAlert = null;
  let budgetStatusLine = '';

  if (newTx.type === 'expense') {
    const txDate = new Date(newTx.date);
    const txMonth = txDate.getMonth() + 1;
    const txYear = txDate.getFullYear();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const monthPrefix = `${txYear}-${pad(txMonth)}`;

    const budget = await Budget.findOne({
      where: {
        user_id: user.id,
        category_id: newTx.category_id,
        month: txMonth,
        year: txYear
      }
    });

    if (budget && Number(budget.amount) > 0) {
      const totalSpent = (await Transaction.sum('amount', {
        where: {
          user_id: user.id,
          category_id: newTx.category_id,
          type: 'expense',
          date: { [Op.startsWith]: monthPrefix }
        }
      })) || 0;

      const percentage = Math.round((totalSpent / Number(budget.amount)) * 100);
      const threshold = budget.alert_threshold || 80;

      if (percentage >= 100) {
        budgetAlert = {
          categoryName: txData.category_name,
          spent: totalSpent,
          budgetAmount: Number(budget.amount),
          percentage,
          level: 'danger' as const,
          message: `🔴 *PERINGATAN ANGGARAN (100%+)*: Pengeluaran untuk "${txData.category_name}" telah melampaui batas (${percentage}%)! Terpakai ${formatRupiah(totalSpent)} dari batas ${formatRupiah(Number(budget.amount))}.`,
        };
        budgetStatusLine = `\n🔴 *Status Anggaran*: *${percentage}%* (Melebihi batas ${formatRupiah(Number(budget.amount))})`;
      } else if (percentage >= threshold) {
        budgetAlert = {
          categoryName: txData.category_name,
          spent: totalSpent,
          budgetAmount: Number(budget.amount),
          percentage,
          level: 'warning' as const,
          message: `🟡 *PERINGATAN ANGGARAN (${threshold}%+)*: Pengeluaran untuk "${txData.category_name}" telah mencapai ${percentage}%! Terpakai ${formatRupiah(totalSpent)} dari batas ${formatRupiah(Number(budget.amount))}.`,
        };
        budgetStatusLine = `\n🟡 *Status Anggaran*: *${percentage}%* (Mendekati batas ${formatRupiah(Number(budget.amount))})`;
      } else {
        budgetStatusLine = `\n🟢 *Status Anggaran*: ${percentage}% dari ${formatRupiah(Number(budget.amount))} (Aman)`;
      }
    }
  }

  const typeLabel = newTx.type === 'income' ? '🟢 *Pemasukan*' : '🔴 *Pengeluaran*';
  const reply =
    `✅ *Catatan Berhasil Disimpan!*\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    `${typeLabel}: *${formatRupiah(Number(newTx.amount))}*\n` +
    `🏷️ *Kategori*: ${txData.category_name}\n` +
    `📝 *Deskripsi*: ${newTx.description}\n` +
    `📅 *Tanggal*: ${newTx.date}` +
    `${budgetStatusLine}\n` +
    `━━━━━━━━━━━━━━━━━━━\n` +
    (budgetAlert ? `${budgetAlert.message}\n━━━━━━━━━━━━━━━━━━━\n` : '') +
    `💡 _Ketik */saldo* untuk melihat ringkasan keuangan Anda._`;

  const categoryObj = userCategories.find((c: any) => c.id === newTx.category_id);

  return {
    reply,
    success: true,
    actionTaken: 'transaction_created',
    transaction: {
      ...newTx.get({plain:true}),
      category: categoryObj,
    },
    budgetAlert,
  };
}