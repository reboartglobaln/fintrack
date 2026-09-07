import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/auth';
import { Category, Transaction, Budget } from '../models/index';

export const getCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const categories = await Category.findAll({
      where: { [Op.or]: [{ user_id: userId }, { user_id: null }] },
      order: [['type', 'ASC'], ['name', 'ASC']],
    });

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

    const category = await Category.findOne({
      where: { id: catId, [Op.or]: [{ user_id: userId }, { user_id: null }] },
    });

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

    const exists = await Category.findOne({
      where: {
        user_id: userId,
        type,
        name: { [Op.iLike]: name },
      },
    });

    if (exists) {
      res.status(409).json({
        success: false,
        message: `Kategori '${name}' untuk tipe ${type === 'income' ? 'Pemasukan' : 'Pengeluaran'} sudah ada.`,
      });
      return;
    }

    const newCategory = await Category.create({
      user_id: userId,
      name,
      icon: icon || 'Tag',
      color: color || '#0ea5e9',
      type,
      is_default: false,
    });

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

    const category = await Category.findOne({ where: { id: catId, user_id: userId } });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategori kustom tidak ditemukan atau kategori default tidak dapat diubah.',
      });
      return;
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (icon) updates.icon = icon;
    if (color) updates.color = color;

    await category.update(updates);

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

    const category = await Category.findOne({ where: { id: catId, user_id: userId } });

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Kategori tidak ditemukan atau kategori bawaan sistem tidak dapat dihapus.',
      });
      return;
    }

    const usedInTx = await Transaction.count({ where: { category_id: catId, user_id: userId } });
    if (usedInTx > 0) {
      res.status(400).json({
        success: false,
        message: 'Kategori tidak dapat dihapus karena masih digunakan pada transaksi.',
      });
      return;
    }

    await Budget.destroy({ where: { category_id: catId, user_id: userId } });
    await category.destroy();

    res.json({
      success: true,
      message: 'Kategori berhasil dihapus.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus kategori.' });
  }
};
