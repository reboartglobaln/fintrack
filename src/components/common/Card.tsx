import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  growth?: number; // e.g., +15 or -8
  icon: React.ReactNode;
  iconBgColor?: string;
  className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  subtitle,
  growth,
  icon,
  iconBgColor = 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400',
  className = '',
}) => {
  const isPositive = growth !== undefined && growth >= 0;

  return (
    <div
      className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {title}
        </span>
      </div>

      <p className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
        {value}
      </p>

      {growth !== undefined ? (
        <p
          className={`text-xs font-bold mt-2 flex items-center gap-1 ${
            isPositive ? 'text-emerald-500' : 'text-rose-500'
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
          <span>
            {isPositive ? '+' : '-'}
            {Math.abs(growth)}% dari bulan lalu
          </span>
        </p>
      ) : subtitle ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
};
