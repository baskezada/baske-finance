import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../../api/client';

interface BankBarChartProps {
    transactions: Transaction[];
}

export function BankBarChart({ transactions }: BankBarChartProps) {
    // Group by bank
    const dataByBank = transactions.reduce((acc, t) => {
        const bank = t.bankName || 'Desconocido';
        const amount = parseFloat(t.amount);

        if (!acc[bank]) {
            acc[bank] = 0;
        }
        acc[bank] += amount;

        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(dataByBank)
        .map(([bank, total]) => ({ bank, total }))
        .sort((a, b) => b.total - a.total);

    return (
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-4">Gastos por Banco</h3>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="bank" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="total" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
