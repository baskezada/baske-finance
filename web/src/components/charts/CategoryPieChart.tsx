import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Transaction } from '../../api/client';

interface CategoryPieChartProps {
    transactions: Transaction[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export function CategoryPieChart({ transactions }: CategoryPieChartProps) {
    // Group by category
    const dataByCategory = transactions.reduce((acc, t) => {
        const category = t.category || 'Sin categoría';
        const amount = parseFloat(t.amount);

        if (!acc[category]) {
            acc[category] = 0;
        }
        acc[category] += amount;

        return acc;
    }, {} as Record<string, number>);

    const chartData = Object.entries(dataByCategory)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
            <h3 className="text-lg font-black text-white mb-4">Gastos por Categoría</h3>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
