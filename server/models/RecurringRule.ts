import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface RecurringRuleAttributes {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string;
  type: 'income' | 'expense';
  recurring_interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_run_date: string;
  last_run_date?: string | null;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type RecurringRuleCreationAttributes = Optional<RecurringRuleAttributes, 'id' | 'last_run_date' | 'is_active'>;

export class RecurringRule extends Model<RecurringRuleAttributes, RecurringRuleCreationAttributes> implements RecurringRuleAttributes {
  public id!: number;
  public user_id!: number;
  public category_id!: number;
  public amount!: number;
  public description!: string;
  public type!: 'income' | 'expense';
  public recurring_interval!: 'daily' | 'weekly' | 'monthly' | 'yearly';
  public next_run_date!: string;
  public last_run_date!: string | null;
  public is_active!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

RecurringRule.init(
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
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    recurring_interval: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'yearly'),
      allowNull: false,
    },
    next_run_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    last_run_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'recurring_rules',
    underscored: true,
    timestamps: true,
  }
);
