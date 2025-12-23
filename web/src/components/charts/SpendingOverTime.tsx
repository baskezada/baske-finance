import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Transaction } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';

interface SpendingOverTimeProps {
    transactions: Transaction[];
    onDateClick?: (date: string) => void;
}

export function SpendingOverTime({ transactions, onDateClick }: SpendingOverTimeProps) {
    const { palette } = useTheme();
    // Helper function to convert amount to CLP
    const getAmountInCLP = (transaction: Transaction): number => {
        const amount = parseFloat(transaction.amount);
        if (transaction.currency === "USD" && transaction.exchangeRate) {
            return amount * parseFloat(transaction.exchangeRate);
        }
        return amount;
    };

    // Group transactions by date for chart with count (using UTC)
    const chartData = useMemo(() => {
        // First, find the date range from transactions
        if (transactions.length === 0) return [];

        const dates = transactions.map(t => new Date(t.transactionDate || t.createdAt));
        const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

        // Get the first and last day of the month range
        const startDate = new Date(Date.UTC(minDate.getUTCFullYear(), minDate.getUTCMonth(), 1));
        const endDate = new Date(Date.UTC(maxDate.getUTCFullYear(), maxDate.getUTCMonth() + 1, 0));

        // Create a map with all dates in the range initialized to 0
        const allDates: Record<string, { total: number; count: number }> = {};
        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = new Intl.DateTimeFormat("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            }).format(currentDate);
            allDates[dateStr] = { total: 0, count: 0 };
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        // Fill in the actual transaction data
        transactions.forEach(t => {
            const dateStr = t.transactionDate || t.createdAt;
            const date = new Intl.DateTimeFormat("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
            }).format(new Date(dateStr));
            const amount = getAmountInCLP(t);

            if (allDates[date]) {
                allDates[date].total += amount;
                allDates[date].count += 1;
            }
        });

        return Object.entries(allDates)
            .map(([date, data]) => ({ date, total: data.total, count: data.count }))
            .sort((a, b) => {
                // Parse Spanish date format for sorting
                const parseDate = (dateStr: string) => {
                    const months: Record<string, number> = {
                        'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
                        'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
                    };
                    const parts = dateStr.split(' ');
                    const day = parseInt(parts[0]);
                    const month = months[parts[1].toLowerCase()];
                    const year = parseInt(parts[2]);
                    return new Date(year, month, day).getTime();
                };
                return parseDate(a.date) - parseDate(b.date);
            });
    }, [transactions]);

    // Calcular promedio y día mayor
    const stats = useMemo(() => {
        if (chartData.length === 0) return { average: 0, highest: 0 };
        const total = chartData.reduce((sum, d) => sum + d.total, 0);
        const average = total / chartData.length;
        const highest = Math.max(...chartData.map(d => d.total));
        return { average, highest };
    }, [chartData]);

    // Custom tooltip component
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-xl">
                    <div className="text-xs text-slate-400 font-black uppercase tracking-wider mb-1">
                        {data.date}
                    </div>
                    <div className="text-lg font-black text-primary mb-1">
                        {new Intl.NumberFormat("es-CL", {
                            style: "currency",
                            currency: "CLP",
                            minimumFractionDigits: 0
                        }).format(data.total)}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                        {data.count} {data.count === 1 ? 'transacción' : 'transacciones'}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">Gastos en el Tiempo</h3>
                <div className="flex gap-4 text-xs">
                    <div className="text-right">
                        <div className="text-slate-500 uppercase tracking-wider font-black">Promedio</div>
                        <div className="text-primary font-black">
                            {new Intl.NumberFormat("es-CL", {
                                style: "currency",
                                currency: "CLP",
                                minimumFractionDigits: 0
                            }).format(stats.average)}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-slate-500 uppercase tracking-wider font-black">Día Mayor</div>
                        <div className="text-red-400 font-black">
                            {new Intl.NumberFormat("es-CL", {
                                style: "currency",
                                currency: "CLP",
                                minimumFractionDigits: 0
                            }).format(stats.highest)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Gráfico de área */}
            <div style={{ cursor: onDateClick ? 'pointer' : 'default' }}>
                <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                        data={chartData}
                        onClick={(data: any) => {
                            if (data && data.activeLabel && onDateClick) {
                                onDateClick(data.activeLabel);
                            }
                        }}
                    >
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={palette.primary} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={palette.primary} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            style={{ fontSize: '12px' }}
                        />
                        <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: palette.primary, strokeWidth: 2 }} />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke={palette.primary}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            activeDot={{
                                r: 8,
                                onClick: (data: any, e: any) => {
                                    if (data && data.payload && data.payload.date && onDateClick) {
                                        e.stopPropagation();
                                        onDateClick(data.payload.date);
                                    }
                                }
                            }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {chartData.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    No hay datos disponibles
                </div>
            )}
        </div>
    );
}
