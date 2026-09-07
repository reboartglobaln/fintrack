import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface BudgetAttributes {
  id: number;
  user_id: number;
  category_id: number;
  month: number;
  year: number;
  amount: number;
  alert_threshold: number; // e.g., 80 or 100%
  created_at?: Date;
  updated_at?: Date;
}

export type BudgetCreationAttributes = Optional<BudgetAttributes, 'id' | 'alert_threshold'>;

export class Budget extends Model<BudgetAttributes, BudgetCreationAttributes> implements BudgetAttributes {
  public id!: number;
  public user_id!: number;
  public category_id!: number;
  public month!: number;
  public year!: number;
  public amount!: number;
  public alert_threshold!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Budget.init(
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
      onDelete: 'CASCADE',
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 12 },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    alert_threshold: {
      type: DataTypes.INTEGER,
      defaultValue: 80,
    },
  },
  {
    sequelize,
    tableName: 'budgets',
    underscored: true,
    timestamps: true,
  }
);
