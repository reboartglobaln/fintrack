import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FolderTree,
  PiggyBank,
  Repeat,
  BarChart3,
  BookOpen,
  Sparkles,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type TabType =
  | 'dashboard'
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'recurring'
  | 'reports'
  | 'bot'
  | 'docs';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();

  const menuItems: { id: TabType; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'bot', label: 'WA & Telegram Bot', icon: MessageCircle, badge: 'Baru' },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'budgets', label: 'Budgets', icon: PiggyBank },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'docs', label: 'API & Solutions', icon: BookOpen, badge: 'Tech' },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        {/* Top Brand Header */}
        <div>
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-200 dark:shadow-none shrink-0">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                FinTrack
              </span>
              <span className="block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Financial Suite
              </span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold transition-colors text-left ${
                    isActive
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive
                          ? 'text-sky-600 dark:text-sky-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-sky-200/70 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden shrink-0">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                {user?.name || 'Pengguna FinTrack'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                {user?.auth_provider === 'google' ? 'Akun Google' : user?.email || 'Akun Standar'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
