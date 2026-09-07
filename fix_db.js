const fs = require('fs');

let content = fs.readFileSync('server/services/chatParserService.ts', 'utf-8');

// Replace imports
content = content.replace(
  /import \{ DbCategory, DbTransaction, DbUser, loadDb, saveDb \} from '\.\/dbStore';/,
  `import { Category, Transaction, Budget } from '../models/index';\nimport { Op } from 'sequelize';`
);

// We need to type User to match Sequelize user model if needed, but any is fine for now
content = content.replace(/user: DbUser;/g, 'user: any;');
content = content.replace(/DbCategory/g, 'any');
content = content.replace(/DbTransaction/g, 'any');

// Rewrite handleIncomingChatMessage
const newHandleFn = `export async function handleIncomingChatMessage({
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
        \`👋 *Selamat datang di FinTrack Bot (\${platformName})!*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        \`Catat pengeluaran & pemasukan semudah mengirim chat biasa.\\n\\n\` +
        \`📝 *Contoh Format Pencatatan:*\\n\` +
        \`• _Makan siang nasi padang 25k_\\n\` +
        \`• _Isi bensin pertamax 50rb_\\n\` +
        \`• _Beli token listrik PLN 150.000_\\n\` +
        \`• _Kopi kenangan 18k_\\n\` +
        \`• _+5000000 Gaji bulanan_\\n\` +
        \`• _Bonus proyek freelance 1.5jt_\\n\\n\` +
        \`⚡ *Perintah Cepat Tersedia:*\\n\` +
        \`• */saldo* - Ringkasan saldo & arus kas bulan ini\\n\` +
        \`• */anggaran* - Cek capaian batas anggaran & peringatan\\n\` +
        \`• */riwayat* - 5 transaksi terakhir Anda\\n\` +
        \`• */kategori* - Daftar kategori yang tersedia\\n\` +
        \`• */bantuan* - Menampilkan pesan panduan ini\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        \`💡 _Cobalah ketik "Makan siang 25k" sekarang!_\`;

      return { reply, success: true, actionTaken: 'help' };
    }

    if (cmd === 'saldo') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const pad = (n: number) => (n < 10 ? \`0\${n}\` : \`\${n}\`);
      const monthPrefix = \`\${currentYear}-\${pad(currentMonth)}\`;

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
        \`📊 *Ringkasan Keuangan FinTrack*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        \`👤 *Pengguna*: \${user.name}\\n\` +
        \`💰 *Total Saldo Bersih*: *\${formatRupiah(totalBalance)}*\\n\\n\` +
        \`📅 *Bulan Berjalan (\${monthName} \${currentYear})*:\\n\` +
        \`🟢 Pemasukan: *+\${formatRupiah(monthIncome)}*\\n\` +
        \`🔴 Pengeluaran: *-\${formatRupiah(monthExpense)}*\\n\` +
        \`⚖️ Arus Kas Bersih: *\${formatRupiah(monthNet)}*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        \`💡 _Ketik */anggaran* untuk memantau batas pengeluaran kategori!_\`;

      return { reply, success: true, actionTaken: 'query' };
    }

    if (cmd === 'anggaran' || cmd === 'budget') {
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const pad = (n: number) => (n < 10 ? \`0\${n}\` : \`\${n}\`);
      const monthPrefix = \`\${currentYear}-\${pad(currentMonth)}\`;

      const userBudgets = await Budget.findAll({
        where: { user_id: user.id, month: currentMonth, year: currentYear }
      });

      if (userBudgets.length === 0) {
        return {
          reply:
            \`🎯 *Anggaran FinTrack*\\n━━━━━━━━━━━━━━━━━━━\\n\` +
            \`Belum ada batas anggaran yang ditetapkan untuk bulan ini.\\n\\n\` +
            \`Silakan buka menu *Budgets* atau *Categories* di aplikasi web FinTrack untuk mengatur target pengeluaran.\`,
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
          \`\${iconStatus} *\${cat?.name || 'Kategori'}*: \${pct}%\\n\` +
          \`   Terpakai: \${formatRupiah(spent)} / \${formatRupiah(Number(b.amount))}\`
        );
      }

      const reply =
        \`🎯 *Status Anggaran Bulan Ini*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        budgetLines.join('\\n\\n') +
        \`\\n━━━━━━━━━━━━━━━━━━━\\n\` +
        \`Keterangan:\\n🟢 Aman (<80%) | 🟡 Waspada (80%+) | 🔴 Melampaui (100%+)\`;

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
          reply: \`📜 *Riwayat Transaksi*\\n━━━━━━━━━━━━━━━━━━━\\nBelum ada transaksi yang tercatat.\`,
          success: true,
          actionTaken: 'query',
        };
      }

      const txLines = userTxs.map((t, idx) => {
        const plain = t.get({plain:true});
        const cat = plain.category;
        const sign = t.type === 'income' ? '+ ' : '- ';
        const emoji = t.type === 'income' ? '🟢' : '🔴';
        return \`\${idx + 1}. \${emoji} *\${t.description}*\\n   \${sign}\${formatRupiah(Number(t.amount))} (\${cat?.name || 'Kategori'}) 📅 \${t.date}\`;
      });

      const reply =
        \`📜 *5 Transaksi Terakhir Anda*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        txLines.join('\\n\\n') +
        \`\\n━━━━━━━━━━━━━━━━━━━\\n\` +
        \`💡 _Ketik */saldo* untuk melihat arus kas total._\`;

      return { reply, success: true, actionTaken: 'query' };
    }

    if (cmd === 'kategori') {
      const expenseCats = userCategories.filter((c: any) => c.type === 'expense').map((c: any) => c.name);
      const incomeCats = userCategories.filter((c: any) => c.type === 'income').map((c: any) => c.name);

      const reply =
        \`🏷️ *Daftar Kategori FinTrack*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        \`🔴 *Pengeluaran:*\\n\` +
        expenseCats.map((c: any) => \`• \${c}\`).join('\\n') +
        \`\\n\\n🟢 *Pemasukan:*\\n\` +
        incomeCats.map((c: any) => \`• \${c}\`).join('\\n') +
        \`\\n━━━━━━━━━━━━━━━━━━━\\n\` +
        \`Bot akan otomatis mencocokkan kata kunci Anda dengan kategori di atas!\`;

      return { reply, success: true, actionTaken: 'query' };
    }
  }

  if (parsed.error || !parsed.transaction) {
    return {
      reply:
        \`❌ *Pesan Tidak Dikenali*\\n\` +
        \`━━━━━━━━━━━━━━━━━━━\\n\` +
        \`\${parsed.error || 'Format pencatatan tidak dikenali.'}\\n\\n\` +
        \`💡 *Contoh yang dapat Anda coba:*\\n\` +
        \`• _Makan siang 25k_\\n\` +
        \`• _Bensin Pertalite 50000_\\n\` +
        \`• _+2500000 Gaji freelance_\\n\` +
        \`• Ketik */bantuan* untuk panduan lengkap.\`,
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
    const pad = (n: number) => (n < 10 ? \`0\${n}\` : \`\${n}\`);
    const monthPrefix = \`\${txYear}-\${pad(txMonth)}\`;

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
          message: \`🔴 *PERINGATAN ANGGARAN (100%+)*: Pengeluaran untuk "\${txData.category_name}" telah melampaui batas (\${percentage}%)! Terpakai \${formatRupiah(totalSpent)} dari batas \${formatRupiah(Number(budget.amount))}.\`,
        };
        budgetStatusLine = \`\\n🔴 *Status Anggaran*: *\${percentage}%* (Melebihi batas \${formatRupiah(Number(budget.amount))})\`;
      } else if (percentage >= threshold) {
        budgetAlert = {
          categoryName: txData.category_name,
          spent: totalSpent,
          budgetAmount: Number(budget.amount),
          percentage,
          level: 'warning' as const,
          message: \`🟡 *PERINGATAN ANGGARAN (\${threshold}%+)*: Pengeluaran untuk "\${txData.category_name}" telah mencapai \${percentage}%! Terpakai \${formatRupiah(totalSpent)} dari batas \${formatRupiah(Number(budget.amount))}.\`,
        };
        budgetStatusLine = \`\\n🟡 *Status Anggaran*: *\${percentage}%* (Mendekati batas \${formatRupiah(Number(budget.amount))})\`;
      } else {
        budgetStatusLine = \`\\n🟢 *Status Anggaran*: \${percentage}% dari \${formatRupiah(Number(budget.amount))} (Aman)\`;
      }
    }
  }

  const typeLabel = newTx.type === 'income' ? '🟢 *Pemasukan*' : '🔴 *Pengeluaran*';
  const reply =
    \`✅ *Catatan Berhasil Disimpan!*\\n\` +
    \`━━━━━━━━━━━━━━━━━━━\\n\` +
    \`\${typeLabel}: *\${formatRupiah(Number(newTx.amount))}*\\n\` +
    \`🏷️ *Kategori*: \${txData.category_name}\\n\` +
    \`📝 *Deskripsi*: \${newTx.description}\\n\` +
    \`📅 *Tanggal*: \${newTx.date}\` +
    \`\${budgetStatusLine}\\n\` +
    \`━━━━━━━━━━━━━━━━━━━\\n\` +
    (budgetAlert ? \`\${budgetAlert.message}\\n━━━━━━━━━━━━━━━━━━━\\n\` : '') +
    \`💡 _Ketik */saldo* untuk melihat ringkasan keuangan Anda._\`;

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
}`;

const startIndex = content.indexOf('export async function handleIncomingChatMessage');
content = content.substring(0, startIndex) + newHandleFn;

fs.writeFileSync('server/services/chatParserService.ts', content, 'utf-8');
console.log('chatParserService updated successfully!');
