import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { TrendData } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

// Register all Chart.js modules
Chart.register(...registerables);

interface IncomeExpenseChartProps {
  data: TrendData;
  isDark?: boolean;
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ data, isDark = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const { selectedCurrency, exchangeRate } = useCurrency();

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Destroy existing chart instance to prevent canvas reuse/ghosting bugs (Problem #4 Fix)
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Convert values according to active currency
    const convertedIncome = data.income.map((v) => Math.round(v * exchangeRate));
    const convertedExpense = data.expense.map((v) => Math.round(v * exchangeRate));

    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    chartInstanceRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Pemasukan',
            data: convertedIncome,
            backgroundColor: '#10b981',
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Pengeluaran',
            data: convertedExpense,
            backgroundColor: '#ef4444',
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              color: textColor,
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12,
                weight: 'bold',
              },
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            titleColor: isDark ? '#ffffff' : '#0f172a',
            bodyColor: isDark ? '#cbd5e1' : '#334155',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 10,
            callbacks: {
              label: (context) => {
                const val = context.raw as number;
                return ` ${context.dataset.label}: ${selectedCurrency} ${val.toLocaleString('id-ID')}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            },
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
              callback: (value) => {
                const num = Number(value);
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
                return num.toString();
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
  }, [data, isDark, selectedCurrency, exchangeRate]);

  return (
    <div className="relative w-full h-72 sm:h-80">
      <canvas ref={canvasRef} />
    </div>
  );
};
