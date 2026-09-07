import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CategoryAttributes {
  id: number;
  user_id?: number | null;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  is_default: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export type CategoryCreationAttributes = Optional<CategoryAttributes, 'id' | 'user_id' | 'is_default'>;

export class Category extends Model<CategoryAttributes, CategoryCreationAttributes> implements CategoryAttributes {
  public id!: number;
  public user_id!: number | null;
  public name!: string;
  public icon!: string;
  public color!: string;
  public type!: 'income' | 'expense';
  public is_default!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Tag',
    },
    color: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '#0ea5e9',
    },
    type: {
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'categories',
    underscored: true,
    timestamps: true,
  }
);
