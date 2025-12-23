import { useMemo } from "react";
import type { Transaction } from "../api/client";
import { Wallet } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

interface BankCardsProps {
  transactions: Transaction[];
  onBankClick?: (bank: string) => void;
  selectedBanks?: string[];
}

export function BankCards({ transactions, onBankClick, selectedBanks = [] }: BankCardsProps) {
  const { palette } = useTheme();
  // Helper function to convert amount to CLP
  const getAmountInCLP = (transaction: Transaction): number => {
    const amount = parseFloat(transaction.amount);
    if (transaction.currency === "USD" && transaction.exchangeRate) {
      return amount * parseFloat(transaction.exchangeRate);
    }
    return amount;
  };

  const bankData = useMemo(() => {
    const bankMap = new Map<string, number>();
    let total = 0;

    transactions.forEach((t) => {
      const amount = getAmountInCLP(t);
      total += amount;
      const bank = t.bankName || "Sin banco";
      bankMap.set(bank, (bankMap.get(bank) || 0) + amount);
    });

    const sorted = Array.from(bankMap.entries())
      .map(([bank, amount]) => ({
        bank,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { banks: sorted, total };
  }, [transactions]);

  if (bankData.banks.length === 0) {
    return (
      <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Gastos por Banco
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
        <Wallet className="w-4 h-4" style={{ color: palette.accent }} />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Gastos por Banco
        </h3>
      </div>

      <div className="space-y-3">
        {bankData.banks.map(({ bank, amount, percentage }, index) => {
          const isSelected = selectedBanks.includes(bank);
          return (
            <div
              key={bank}
              onClick={() => onBankClick && onBankClick(bank)}
              className="group relative bg-slate-800/30 hover:bg-slate-800/50 border rounded-xl p-4 transition-all"
              style={{
                borderColor: isSelected ? palette.accent : 'rgb(51 65 85 / 0.5)',
                backgroundColor: isSelected ? `${palette.accent}1A` : undefined,
                cursor: onBankClick ? 'pointer' : 'default'
              }}
            >
              {/* Barra de progreso de fondo */}
              <div
                className="absolute inset-0 bg-gradient-to-r to-transparent rounded-xl transition-all"
                style={{
                  background: `linear-gradient(to right, ${palette.accent}${isSelected ? '33' : '1A'}, transparent)`,
                  width: `${percentage}%`
                }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border"
                    style={{
                      backgroundColor: isSelected ? `${palette.accent}4D` : `${palette.accent}33`,
                      color: isSelected ? palette.accentLight : palette.accent,
                      borderColor: isSelected ? `${palette.accent}80` : `${palette.accent}4D`
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: isSelected ? palette.accentLight : 'white' }}>{bank}</p>
                    <p className="text-xs text-slate-500">
                      {percentage.toFixed(1)}% del total
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black tabular-nums" style={{ color: isSelected ? palette.accentLight : 'white' }}>
                    {new Intl.NumberFormat("es-CL", {
                      style: "currency",
                      currency: "CLP",
                      minimumFractionDigits: 0,
                    }).format(amount)}
                  </p>
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
          <span className="text-xl font-black tabular-nums" style={{ color: palette.accent }}>
            {new Intl.NumberFormat("es-CL", {
              style: "currency",
              currency: "CLP",
              minimumFractionDigits: 0,
            }).format(bankData.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
