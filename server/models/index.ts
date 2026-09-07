import { sequelize } from '../config/database';
import { User } from './User';
import { Category } from './Category';
import { Transaction } from './Transaction';
import { Budget } from './Budget';
import { RecurringRule } from './RecurringRule';

// User <-> Category
User.hasMany(Category, { foreignKey: 'user_id', as: 'categories', onDelete: 'CASCADE' });
Category.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> Transaction
User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category <-> Transaction
Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions', onDelete: 'RESTRICT' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User <-> Budget
User.hasMany(Budget, { foreignKey: 'user_id', as: 'budgets', onDelete: 'CASCADE' });
Budget.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category <-> Budget
Category.hasMany(Budget, { foreignKey: 'category_id', as: 'budgets', onDelete: 'CASCADE' });
Budget.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// User <-> RecurringRule
User.hasMany(RecurringRule, { foreignKey: 'user_id', as: 'recurring_rules', onDelete: 'CASCADE' });
RecurringRule.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Category <-> RecurringRule
Category.hasMany(RecurringRule, { foreignKey: 'category_id', as: 'recurring_rules', onDelete: 'RESTRICT' });
RecurringRule.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

export { sequelize, User, Category, Transaction, Budget, RecurringRule };
