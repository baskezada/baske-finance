import { useTheme } from "../contexts/ThemeContext";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle?: string;
    percentageChange?: number;
}

export function MetricCard({ title, value, icon, subtitle, percentageChange }: MetricCardProps) {
    const { palette } = useTheme();

    const getTrendIcon = () => {
        if (percentageChange === undefined || percentageChange === 0) {
            return <Minus className="w-3 h-3" />;
        }
        return percentageChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
    };

    const getTrendColor = () => {
        if (percentageChange === undefined || percentageChange === 0) {
            return '#64748b'; // slate-500
        }
        return percentageChange > 0 ? '#ef4444' : '#10b981'; // red-500 : emerald-500
    };

    return (
        <div
            className="bg-slate-900/30 backdrop-blur-xl border rounded-2xl p-6 transition-all"
            style={{ borderColor: 'rgb(30 41 59)' }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = `${palette.primary}4D`}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgb(30 41 59)'}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{title}</p>
                    <p className="text-2xl font-black text-white tabular-nums">{value}</p>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                    {percentageChange !== undefined && (
                        <div className="flex items-center gap-1 mt-2">
                            <div
                                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black"
                                style={{
                                    backgroundColor: `${getTrendColor()}20`,
                                    color: getTrendColor()
                                }}
                            >
                                {getTrendIcon()}
                                <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">vs mes anterior</span>
                        </div>
                    )}
                </div>
                <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border"
                    style={{
                        backgroundColor: `${palette.primary}1A`,
                        color: palette.primary,
                        borderColor: `${palette.primary}33`
                    }}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}
