import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../../api/client';

interface SpendingOverTimeProps {
    transactions: Transaction[];
}

export function SpendingOverTime({ transactions }: SpendingOverTimeProps) {
    // Group transactions by date
    const dataByDate = transactions.reduce((acc, t) => {
        const date = t.transactionDate ? new Date(t.transactionDate).toLocaleDateString('es-AR') : new Date(t.createdAt).toLocaleDateString('es-AR');
        const amount = parseFloat(t.amount);

        if (!acc[date]) {
            acc[date] = 0;
        }
        acc[date] += amount;

        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(dataByDate)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return (
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-4">Gastos en el Tiempo</h3>
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                        labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#10b981" fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
