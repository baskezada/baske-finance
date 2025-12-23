import { useMemo } from "react";
import type { Transaction } from "../api/client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface CategoryCardsProps {
  transactions: Transaction[];
  previousMonthTransactions?: Transaction[];
  onCategoryClick?: (category: string) => void;
  selectedCategories?: string[];
}

export function CategoryCards({ transactions, previousMonthTransactions = [], onCategoryClick, selectedCategories = [] }: CategoryCardsProps) {
  const { palette } = useTheme();
  // Helper function to convert amount to CLP
  const getAmountInCLP = (transaction: Transaction): number => {
    const amount = parseFloat(transaction.amount);
    if (transaction.currency === "USD" && transaction.exchangeRate) {
      return amount * parseFloat(transaction.exchangeRate);
    }
    return amount;
  };

  const categoryData = useMemo(() => {
    // Current month data
    const categoryMap = new Map<string, number>();
    let total = 0;

    transactions.forEach((t) => {
      const amount = getAmountInCLP(t);
      total += amount;
      const category = t.category || "Sin categoría";
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });

    // Previous month data
    const prevCategoryMap = new Map<string, number>();
    previousMonthTransactions.forEach((t) => {
      const amount = getAmountInCLP(t);
      const category = t.category || "Sin categoría";
      prevCategoryMap.set(category, (prevCategoryMap.get(category) || 0) + amount);
    });

    const sorted = Array.from(categoryMap.entries())
      .map(([category, amount]) => {
        const prevAmount = prevCategoryMap.get(category) || 0;
        const percentageChange = prevAmount > 0
          ? ((amount - prevAmount) / prevAmount) * 100
          : (amount > 0 ? 100 : 0);

        return {
          category,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
          percentageChange: previousMonthTransactions.length > 0 ? percentageChange : undefined,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    return { categories: sorted, total };
  }, [transactions, previousMonthTransactions]);

  if (categoryData.categories.length === 0) {
    return (
      <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Gastos por Categoría
          </h3>
        </div>
        <p className="text-slate-500 text-sm text-center py-8">
          No hay datos disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4" style={{ color: palette.primary }} />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Gastos por Categoría
        </h3>
      </div>

      <div className="space-y-3">
        {categoryData.categories.map(({ category, amount, percentage, percentageChange }, index) => {
          const isSelected = selectedCategories.includes(category);

          const getTrendIcon = () => {
            if (percentageChange === undefined || percentageChange === 0) {
              return <Minus className="w-3 h-3" />;
            }
            return percentageChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
          };

          const getTrendColor = () => {
            if (percentageChange === undefined || percentageChange === 0) {
              return '#64748b';
            }
            return percentageChange > 0 ? '#ef4444' : '#10b981';
          };

          return (
            <div
              key={category}
              onClick={() => onCategoryClick && onCategoryClick(category)}
              className="group relative bg-slate-800/30 hover:bg-slate-800/50 border rounded-xl p-4 transition-all"
              style={{
                borderColor: isSelected ? palette.primary : 'rgb(51 65 85 / 0.5)',
                backgroundColor: isSelected ? `${palette.primary}1A` : undefined,
                cursor: onCategoryClick ? 'pointer' : 'default'
              }}
            >
              {/* Barra de progreso de fondo */}
              <div
                className="absolute inset-0 bg-gradient-to-r to-transparent rounded-xl transition-all"
                style={{
                  background: `linear-gradient(to right, ${palette.primary}${isSelected ? '33' : '1A'}, transparent)`,
                  width: `${percentage}%`
                }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border"
                    style={{
                      backgroundColor: isSelected ? `${palette.primary}4D` : `${palette.primary}33`,
                      color: isSelected ? palette.primaryLight : palette.primary,
                      borderColor: isSelected ? `${palette.primary}80` : `${palette.primary}4D`
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: isSelected ? palette.primaryLight : 'white' }}>{category}</p>
                    <p className="text-xs text-slate-500">
                      {percentage.toFixed(1)}% del total
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black tabular-nums" style={{ color: isSelected ? palette.primaryLight : 'white' }}>
                    {new Intl.NumberFormat("es-CL", {
                      style: "currency",
                      currency: "CLP",
                      minimumFractionDigits: 0,
                    }).format(amount)}
                  </p>
                  {percentageChange !== undefined && (
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <div
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black"
                        style={{
                          backgroundColor: `${getTrendColor()}20`,
                          color: getTrendColor()
                        }}
                      >
                        {getTrendIcon()}
                        <span>{Math.abs(percentageChange).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total
          </span>
          <span className="text-xl font-black tabular-nums" style={{ color: palette.primary }}>
            {new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency: "CLP",
              minimumFractionDigits: 0,
            }).format(categoryData.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
