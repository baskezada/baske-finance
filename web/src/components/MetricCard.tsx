interface MetricCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    subtitle?: string;
}

export function MetricCard({ title, value, icon, subtitle }: MetricCardProps) {
    return (
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{title}</p>
                    <p className="text-2xl font-black text-white tabular-nums">{value}</p>
                    {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                    {icon}
                </div>
            </div>
        </div>
    );
}
