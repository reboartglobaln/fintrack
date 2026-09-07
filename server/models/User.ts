import { DataTypes, Model, Optional } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/database';

export interface UserAttributes {
  id: number;
  name: string;
  email: string;
  password: string;
  avatar?: string;
  base_currency: string;
  reset_token?: string | null;
  reset_token_expiry?: Date | null;
  created_at?: Date;
  updated_at?: Date;
}

export type UserCreationAttributes = Optional<UserAttributes, 'id' | 'avatar' | 'base_currency' | 'reset_token' | 'reset_token_expiry'>;

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public avatar!: string;
  public base_currency!: string;
  public reset_token!: string | null;
  public reset_token_expiry!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Instance method for password verification
  public async comparePassword(candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING(500),
      defaultValue: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    },
    base_currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'IDR',
    },
    reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    reset_token_expiry: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
    underscored: true,
    timestamps: true,
    hooks: {
      beforeSave: async (user: User) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
    },
  }
);
