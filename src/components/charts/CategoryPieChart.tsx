import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { CategoryBreakdownItem } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

Chart.register(...registerables);

interface CategoryPieChartProps {
  items: CategoryBreakdownItem[];
  isDark?: boolean;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ items, isDark = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const { selectedCurrency, exchangeRate } = useCurrency();

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    if (!items || items.length === 0) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const labels = items.map((i) => i.name);
    const data = items.map((i) => Math.round(i.amount * exchangeRate));
    const colors = items.map((i) => i.color || '#0ea5e9');
    const textColor = isDark ? '#94a3b8' : '#64748b';

    chartInstanceRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: isDark ? '#0f172a' : '#ffffff',
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              boxWidth: 10,
              boxHeight: 10,
              usePointStyle: true,
              padding: 14,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
              },
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            titleColor: isDark ? '#ffffff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => {
                const val = context.raw as number;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((val / total) * 100) : 0;
                return ` ${context.label}: ${selectedCurrency} ${val.toLocaleString('id-ID')} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [items, isDark, selectedCurrency, exchangeRate]);

  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-slate-400">
        Belum ada data pengeluaran untuk periode ini.
      </div>
    );
  }

  return (
    <div className="relative w-full h-72 sm:h-80">
      <canvas ref={canvasRef} />
    </div>
  );
};
