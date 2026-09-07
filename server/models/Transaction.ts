import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface TransactionAttributes {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  is_recurring: boolean;
  recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  currency: string;
  exchange_rate: number;
  created_at?: Date;
  updated_at?: Date;
}

export type TransactionCreationAttributes = Optional<
  TransactionAttributes,
  'id' | 'is_recurring' | 'recurring_interval' | 'currency' | 'exchange_rate'
>;

export class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: number;
  public user_id!: number;
  public category_id!: number;
  public amount!: number;
  public description!: string;
  public date!: string;
  public type!: 'income' | 'expense';
  public is_recurring!: boolean;
  public recurring_interval!: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  public currency!: string;
  public exchange_rate!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Transaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    is_recurring: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recurring_interval: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'IDR',
    },
    exchange_rate: {
      type: DataTypes.DECIMAL(12, 6),
      defaultValue: 1.0,
    },
  },
  {
    sequelize,
    tableName: 'transactions',
    underscored: true,
    timestamps: true,
  }
);
