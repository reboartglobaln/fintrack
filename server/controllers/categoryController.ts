import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { loadDb, saveDb } from '../services/dbStore';

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const db = loadDb();

    // Return user's categories or default categories
    const categories = db.categories.filter((c) => c.user_id === userId || c.user_id === null);

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memuat kategori.', error: (error as Error).message });
  }
};

export const getCategoryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const catId = Number(req.params.id);
    const db = loadDb();

    const category = db.categories.find(
      (c) => c.id === catId && (c.user_id === userId || c.user_id === null)
    );

    if (!category) {
      res.status(404).json({ success: false, message: 'Kategori tidak ditemukan.' });
      return;
    }

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil kategori.' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { name, icon, color, type } = req.body;
    const db = loadDb();

    // Check duplicate
    const exists = db.categories.find(
      (c) => c.user_id === userId && c.type === type && c.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      res.status(409).json({
        success: false,
        message: `Kategori '${name}' untuk tipe ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} sudah ada.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const newCategory = {
      id: db.nextIds.categories++,
      user_id: userId,
      name,
      icon: icon || 'Tag',
      color: color || '#0ea5e9',
      type: type as 'income' | 'expense',
      is_default: false,
      created_at: now,
      updated_at: now,
    };

    db.categories.push(newCategory);
    saveDb(db);

    res.status(201).json({
      success: true,
      message: 'Kategori baru berhasil dibuat.',
      data: newCategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal membuat kategori baru.' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const catId = Number(req.params.id);
    const { name, icon, color } = req.body;
    const db = loadDb();

    const category = db.categories.find((c) => c.id === catId && c.user_id === userId);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategori kustom tidak ditemukan atau kategori default tidak dapat diubah.',
      });
      return;
    }

    if (name) category.name = name;
    if (icon) category.icon = icon;
    if (color) category.color = color;
    category.updated_at = new Date().toISOString();

    saveDb(db);

    res.json({
      success: true,
      message: 'Kategori berhasil diperbarui.',
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal memperbarui kategori.' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const catId = Number(req.params.id);
    const db = loadDb();

    const catIndex = db.categories.findIndex((c) => c.id === catId && c.user_id === userId);

    if (catIndex === -1) {
      res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan atau kategori bawaan sistem tidak dapat dihapus.',
      });
      return;
    }

    // Check if category has transactions
    const usedInTx = db.transactions.some((t) => t.category_id === catId && t.user_id === userId);
    if (usedInTx) {
      res.status(400).json({
        success: false,
        message: 'Kategori tidak dapat dihapus karena masih digunakan pada transaksi.',
      });
      return;
    }

    db.categories.splice(catIndex, 1);
    // Also remove any budget associated with this category
    db.budgets = db.budgets.filter((b) => !(b.category_id === catId && b.user_id === userId));

    saveDb(db);

    res.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
};
