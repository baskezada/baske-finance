import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Download, DollarSign, Wallet, TrendingUp, CreditCard, Pencil, Trash2, Save, Filter, LogOut, FileText, ChevronDown, Settings } from "lucide-react";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/modal";
import { api, type Transaction } from "../api/client";
import { Input } from "../components/ui/input";
import { SpendingOverTime } from "../components/charts/SpendingOverTime";
import { CategoryCards } from "../components/CategoryCards";
import { BankCards } from "../components/BankCards";
import { MetricCard } from "../components/MetricCard";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";
import EmlUploadButton from "@/components/EmlUploadButton";
import ReactMarkdown from "react-markdown";
import { useTheme } from "../contexts/ThemeContext";

function Transactions() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { palette } = useTheme();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [selectedBank, setSelectedBank] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewTransactions, setPreviewTransactions] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [isPurchaseDetailsModalOpen, setIsPurchaseDetailsModalOpen] = useState(false);
    const [selectedPurchaseSummary, setSelectedPurchaseSummary] = useState<string | null>(null);
    const [notificationModal, setNotificationModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    // Filters
    const currentDate = new Date();
    const [filters, setFilters] = useState({
        month: (currentDate.getMonth() + 1).toString().padStart(2, '0'), // Mes actual (01-12)
        year: currentDate.getFullYear().toString(), // Año actual
        startDate: "",
        endDate: "",
        category: "",
        bankName: ""
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Interactive filters (multiple selection for categories and banks only)
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

    // Modal para transacciones por día
    const [dayDetailsModal, setDayDetailsModal] = useState<{ isOpen: boolean; date: string; transactions: Transaction[] }>({
        isOpen: false,
        date: '',
        transactions: []
    });

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ["transactions", filters],
        queryFn: () => api.transactions.list(filters),
    });

    // Get previous month transactions for comparison
    const previousMonthFilters = useMemo(() => {
        const currentMonth = parseInt(filters.month);
        const currentYear = parseInt(filters.year);
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        return {
            month: prevMonth.toString().padStart(2, '0'),
            year: prevYear.toString(),
            startDate: "",
            endDate: "",
            category: "",
            bankName: ""
        };
    }, [filters.month, filters.year]);

    const { data: previousMonthTransactions = [] } = useQuery({
        queryKey: ["transactions", "previous", previousMonthFilters],
        queryFn: () => api.transactions.list(previousMonthFilters),
    });

    const { data: banks = [] } = useQuery({
        queryKey: ["banks"],
        queryFn: api.banks.list,
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!selectedBank) {
            setNotificationModal({
                isOpen: true,
                title: 'Error',
                message: 'Por favor selecciona un banco primero',
                type: 'error'
            });
            return;
        }

        setSelectedFile(file);
        setIsProcessing(true);

        try {
            const result = await api.gmail.importExcel(file, selectedBank);
            setPreviewTransactions(result.transactions);
            setNotificationModal({
                isOpen: true,
                title: 'Éxito',
                message: `Se encontraron ${result.count} transacciones. Revisa el preview y confirma la importación.`,
                type: 'success'
            });
        } catch (error) {
            setNotificationModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al procesar el archivo Excel',
                type: 'error'
            });
            setSelectedFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmImportMutation = useMutation({
        mutationFn: () => api.gmail.confirmExcelImport(previewTransactions, selectedBank),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            setNotificationModal({
                isOpen: true,
                title: 'Éxito',
                message: `Se importaron ${data.imported} transacciones correctamente`,
                type: 'success'
            });
            setIsImportModalOpen(false);
            setSelectedFile(null);
            setPreviewTransactions([]);
            setSelectedBank("");
        },
        onError: () => {
            setNotificationModal({
                isOpen: true,
                title: 'Error',
                message: 'Error al guardar las transacciones',
                type: 'error'
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<Transaction> }) => api.transactions.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            setIsEditModalOpen(false);
            setEditingTransaction(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: api.transactions.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            setIsDeleteModalOpen(false);
            setDeletingTransactionId(null);
            setNotificationModal({
                isOpen: true,
                title: 'Éxito',
                message: 'Transacción eliminada correctamente',
                type: 'success'
            });
        },
        onError: () => {
            setNotificationModal({
                isOpen: true,
                title: 'Error',
                message: 'No se pudo eliminar la transacción',
                type: 'error'
            });
        }
    });

    const handleEdit = (t: Transaction) => {
        setEditingTransaction(t);
        setIsEditModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setDeletingTransactionId(id);
        setIsDeleteModalOpen(true);
    };

    const handleViewPurchaseDetails = (purchaseSummary: string) => {
        setSelectedPurchaseSummary(purchaseSummary);
        setIsPurchaseDetailsModalOpen(true);
    };

    const confirmDelete = () => {
        if (deletingTransactionId) {
            deleteMutation.mutate(deletingTransactionId);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const formatDateUTC = (dateStr: string) => {
        return new Intl.DateTimeFormat("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }).format(new Date(dateStr));
    };

    const formatHourUTC = (dateStr: string) => {
        return new Intl.DateTimeFormat("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
        }).format(new Date(dateStr));
    };

    // Get unique categories and banks for filters
    const uniqueCategories = useMemo(() => {
        const cats = new Set(transactions.map(t => t.category).filter(Boolean));
        return Array.from(cats);
    }, [transactions]);

    const uniqueBanks = useMemo(() => {
        const banks = new Set(transactions.map(t => t.bankName).filter(Boolean));
        return Array.from(banks);
    }, [transactions]);

    // Helper function to convert amount to CLP
    const getAmountInCLP = (transaction: Transaction): number => {
        const amount = parseFloat(transaction.amount);
        if (transaction.currency === "USD" && transaction.exchangeRate) {
            return amount * parseFloat(transaction.exchangeRate);
        }
        return amount;
    };

    // Format date for comparison with UTC
    const formatDateForFilter = (dateStr: string): string => {
        return new Intl.DateTimeFormat("es-CL", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        }).format(new Date(dateStr));
    };

    // Handle date click to show modal with day's transactions
    const handleDateClick = (date: string) => {
        const dayTransactions = transactions.filter(t => {
            const transactionDate = t.transactionDate || t.createdAt;
            const formattedDate = formatDateForFilter(transactionDate);
            return formattedDate === date;
        });

        setDayDetailsModal({
            isOpen: true,
            date,
            transactions: dayTransactions
        });
    };

    const handleCategoryClick = (category: string) => {
        setSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const handleBankClick = (bank: string) => {
        setSelectedBanks(prev =>
            prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
        );
    };

    const clearInteractiveFilters = () => {
        setSelectedCategories([]);
        setSelectedBanks([]);
    };

    // Apply interactive filters to transactions (categories and banks only)
    const filteredTransactions = useMemo(() => {
        let filtered = transactions;

        // Filter by selected categories
        if (selectedCategories.length > 0) {
            filtered = filtered.filter(t =>
                t.category && selectedCategories.includes(t.category)
            );
        }

        // Filter by selected banks
        if (selectedBanks.length > 0) {
            filtered = filtered.filter(t =>
                t.bankName && selectedBanks.includes(t.bankName)
            );
        }

        return filtered;
    }, [transactions, selectedCategories, selectedBanks]);

    // Calculate metrics based on filtered transactions
    const metrics = useMemo(() => {
        // Current month metrics
        const total = filteredTransactions.reduce((sum, t) => sum + getAmountInCLP(t), 0);
        const average = filteredTransactions.length > 0 ? total / filteredTransactions.length : 0;
        const bankSpending = filteredTransactions.reduce((acc, t) => {
            const bank = t.bankName || "Desconocido";
            acc[bank] = (acc[bank] || 0) + getAmountInCLP(t);
            return acc;
        }, {} as Record<string, number>);
        const topBank = Object.entries(bankSpending).sort((a, b) => b[1] - a[1])[0];

        // Previous month metrics (only when not using interactive filters)
        const prevTotal = previousMonthTransactions.reduce((sum, t) => sum + getAmountInCLP(t), 0);
        const prevAverage = previousMonthTransactions.length > 0 ? prevTotal / previousMonthTransactions.length : 0;
        const prevCount = previousMonthTransactions.length;

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        // Only show comparisons when no interactive filters are active
        const hasInteractiveFilters = selectedCategories.length > 0 || selectedBanks.length > 0;

        return {
            total,
            average,
            count: filteredTransactions.length,
            topBank: topBank ? topBank[0] : "N/A",
            totalChange: hasInteractiveFilters ? undefined : calculateChange(total, prevTotal),
            averageChange: hasInteractiveFilters ? undefined : calculateChange(average, prevAverage),
            countChange: hasInteractiveFilters ? undefined : calculateChange(filteredTransactions.length, prevCount)
        };
    }, [filteredTransactions, previousMonthTransactions, selectedCategories.length, selectedBanks.length]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="animate-pulse">Cargando dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            <title>Dashboard - Baske Finance</title>

            {/* Header fijo */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
                <div className="max-w-[1600px] mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name || ""} className="w-10 h-10 rounded-full border-2" style={{ borderColor: `${palette.primary}4D` }} />
                        ) : (
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 text-sm" style={{ backgroundColor: `${palette.primary}1A`, color: palette.primary, borderColor: `${palette.primary}33` }}>
                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-black text-white flex items-center gap-2">
                                <span style={{ color: palette.primary }}>{user?.name || user?.email?.split('@')[0]}</span>
                            </h1>
                            <p className="text-slate-500 text-xs">
                                Dashboard Financiero
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <EmlUploadButton />
                        <Button
                            onClick={() => setIsImportModalOpen(true)}
                            className="text-white px-4 py-2 rounded-xl h-auto text-sm"
                            style={{ backgroundColor: palette.primary }}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Importar Excel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/settings')}
                            className="border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Ajustes
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => logout().then(() => navigate('/login'))}
                            className="border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Salir
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">

                {/* Filtros y Métricas combinados */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Panel de filtros lateral */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 sticky top-24">
                            <div className="flex items-center gap-2 mb-4">
                                <Filter className="w-4 h-4" style={{ color: palette.primary }} />
                                <h2 className="text-sm font-black text-white uppercase tracking-wider">Filtros</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Mes</label>
                                    <select
                                        value={filters.month}
                                        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none transition-all"
                                        style={{ borderColor: 'rgb(51 65 85)' }}
                                        onFocus={(e) => e.target.style.borderColor = `${palette.primary}80`}
                                        onBlur={(e) => e.target.style.borderColor = 'rgb(51 65 85)'}
                                    >
                                        <option value="01">Enero</option>
                                        <option value="02">Febrero</option>
                                        <option value="03">Marzo</option>
                                        <option value="04">Abril</option>
                                        <option value="05">Mayo</option>
                                        <option value="06">Junio</option>
                                        <option value="07">Julio</option>
                                        <option value="08">Agosto</option>
                                        <option value="09">Septiembre</option>
                                        <option value="10">Octubre</option>
                                        <option value="11">Noviembre</option>
                                        <option value="12">Diciembre</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Año</label>
                                    <select
                                        value={filters.year}
                                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => {
                                            const year = currentDate.getFullYear() - i;
                                            return <option key={year} value={year}>{year}</option>;
                                        })}
                                    </select>
                                </div>

                                <div className="border-t border-slate-800 pt-4 mt-4">
                                    <button
                                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors mb-3"
                                    >
                                        <span className="font-bold uppercase tracking-wider">Filtros Avanzados</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showAdvancedFilters && (
                                        <div className="space-y-4 animate-in slide-in-from-top-2">
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Desde</label>
                                                <Input
                                                    type="date"
                                                    value={filters.startDate}
                                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Hasta</label>
                                                <Input
                                                    type="date"
                                                    value={filters.endDate}
                                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Categoría</label>
                                                <select
                                                    value={filters.category || ""}
                                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                                >
                                                    <option value="">Todas</option>
                                                    {uniqueCategories.map(cat => (
                                                        <option key={cat} value={cat}>{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Banco</label>
                                                <select
                                                    value={filters.bankName || ""}
                                                    onChange={(e) => setFilters({ ...filters, bankName: e.target.value })}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-all"
                                                >
                                                    <option value="">Todos</option>
                                                    {uniqueBanks.map(bank => (
                                                        <option key={bank} value={bank}>{bank}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <MetricCard
                                title="Total Gastado"
                                value={new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(metrics.total)}
                                icon={<DollarSign className="w-5 h-5" />}
                                percentageChange={metrics.totalChange}
                            />
                            <MetricCard
                                title="Promedio"
                                value={new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(metrics.average)}
                                icon={<TrendingUp className="w-5 h-5" />}
                                subtitle="por transacción"
                                percentageChange={metrics.averageChange}
                            />
                            <MetricCard
                                title="Transacciones"
                                value={metrics.count.toString()}
                                icon={<CreditCard className="w-5 h-5" />}
                                percentageChange={metrics.countChange}
                            />
                            <MetricCard
                                title="Banco Principal"
                                value={metrics.topBank}
                                icon={<Wallet className="w-5 h-5" />}
                            />
                        </div>

                        {/* Botón de limpiar filtros */}
                        {(selectedCategories.length > 0 || selectedBanks.length > 0) && (
                            <div className="flex justify-end">
                                <button
                                    onClick={clearInteractiveFilters}
                                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 hover:border-red-500/50 rounded-xl text-sm text-red-400 font-bold transition-all"
                                >
                                    Limpiar Filtros ({selectedCategories.length + selectedBanks.length})
                                </button>
                            </div>
                        )}

                        {/* Gráfico de gastos en el tiempo */}
                        <SpendingOverTime
                            transactions={filteredTransactions}
                            onDateClick={handleDateClick}
                        />

                        {/* Cards de distribución */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <CategoryCards
                                transactions={filteredTransactions}
                                previousMonthTransactions={selectedCategories.length === 0 && selectedBanks.length === 0 ? previousMonthTransactions : undefined}
                                onCategoryClick={handleCategoryClick}
                                selectedCategories={selectedCategories}
                            />
                            <BankCards
                                transactions={filteredTransactions}
                                onBankClick={handleBankClick}
                                selectedBanks={selectedBanks}
                            />
                        </div>

                        {/* Table */}
                        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-xl shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-800">
                                <h2 className="text-sm font-black text-white uppercase tracking-wider">Transacciones Recientes</h2>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-900 border-b border-slate-800">
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha Gasto</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Banco</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">Descripción</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Monto</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredTransactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-20 text-center text-slate-600">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <Wallet className="w-12 h-12 opacity-20" />
                                                        <p>No se encontraron transacciones.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredTransactions.map((t) => (
                                                <tr key={t.id} className="group hover:bg-slate-800/20 transition-colors">
                                                    <td className="px-6 py-4 align-middle">

                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs font-medium text-slate-500">{t.transactionDate ? formatHourUTC(t.transactionDate) : "---"}</span>

                                                            <span className="text-sm font-medium text-white">{t.transactionDate ? formatDateUTC(t.transactionDate) : "---"}</span>
                                                        </div>


                                                    </td>

                                                    <td className="px-6 py-5 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${palette.accent}1A`, color: palette.accent, borderColor: `${palette.accent}33` }}>
                                                                <DollarSign className="w-4 h-4" />
                                                            </div>
                                                            <span className="font-bold text-white transition-colors" style={{ color: 'white' }} onMouseEnter={(e) => e.currentTarget.style.color = palette.accent} onMouseLeave={(e) => e.currentTarget.style.color = 'white'}>{t.bankName || "Banco"}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-middle">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-slate-200 font-medium">{t.description || "Sin descripción"}</span>
                                                                {t.purchaseSummary && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleViewPurchaseDetails(t.purchaseSummary!)}
                                                                        className="h-6 px-2 text-xs"
                                                                        style={{ color: palette.primary }}
                                                                        onMouseEnter={(e) => {
                                                                            e.currentTarget.style.color = palette.primaryLight;
                                                                            e.currentTarget.style.backgroundColor = `${palette.primary}1A`;
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.currentTarget.style.color = palette.primary;
                                                                            e.currentTarget.style.backgroundColor = 'transparent';
                                                                        }}
                                                                        title="Ver detalles de compra"
                                                                    >
                                                                        <FileText className="w-3 h-3 mr-1" />
                                                                        Detalles
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            {t.category && (
                                                                <span className="text-[10px] uppercase font-black tracking-tighter text-slate-500 mt-1">{t.category}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-middle text-right">
                                                        <div className="flex flex-col items-end">
                                                            {/* Monto en moneda original */}
                                                            <span className="text-lg font-black tabular-nums" style={{ color: t.transactionType === 'abono' ? palette.accent : palette.primary }}>
                                                                {t.transactionType === 'abono' ? '+' : '-'} {new Intl.NumberFormat("es-AR", { style: "currency", currency: t.currency }).format(parseFloat(t.amount))}
                                                            </span>
                                                            {/* Si es USD, mostrar equivalente en CLP */}
                                                            {t.currency === "USD" && t.exchangeRate && (
                                                                <span className="text-xs text-slate-500 font-medium">
                                                                    ≈ {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(parseFloat(t.amount) * parseFloat(t.exchangeRate))}
                                                                </span>
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] uppercase font-black tracking-wider" style={{ color: t.transactionType === 'abono' ? `${palette.accent}99` : `${palette.primary}99` }}>
                                                                    {t.transactionType}
                                                                </span>
                                                                {t.cardLastFour && (
                                                                    <span className="text-[10px] text-slate-500 font-mono">• ...{t.cardLastFour}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 align-middle text-right">
                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleEdit(t)}
                                                                className="h-8 w-8 p-0 text-slate-400"
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.color = palette.primary;
                                                                    e.currentTarget.style.backgroundColor = `${palette.primary}1A`;
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.color = 'rgb(148 163 184)';
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                }}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDelete(t.id)}
                                                                className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Importación desde Excel */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setSelectedFile(null);
                    setPreviewTransactions([]);
                    setSelectedBank("");
                }}
                title="Importar desde Excel"
            >
                <div className="space-y-6 py-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-4">
                        <Download className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-200/80 leading-relaxed">
                            Sube un archivo Excel con tus transacciones. La IA lo procesará automáticamente sin importar el formato.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Banco</label>
                            <select
                                value={selectedBank}
                                onChange={(e) => setSelectedBank(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all"
                                disabled={isProcessing || previewTransactions.length > 0}
                            >
                                <option value="">Selecciona un banco</option>
                                {banks.map(bank => (
                                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Archivo Excel</label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileChange}
                                disabled={!selectedBank || isProcessing}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 disabled:opacity-50"
                            />
                        </div>

                        {isProcessing && (
                            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
                                <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                                <span className="text-sm text-slate-300">Procesando archivo con IA...</span>
                            </div>
                        )}

                        {previewTransactions.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-black text-white">Preview ({previewTransactions.length} transacciones)</h4>
                                </div>
                                <div className="max-h-64 overflow-y-auto bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-2">
                                    {previewTransactions.slice(0, 5).map((t, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                                            <div>
                                                <p className="text-sm font-medium text-white">{t.description || "Sin descripción"}</p>
                                                <p className="text-xs text-slate-500">{t.category} • {t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : "Sin fecha"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${t.transactionType === 'abono' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {t.transactionType === 'abono' ? '+' : '-'} ${t.amount}
                                                </p>
                                                <p className="text-xs text-slate-500">{t.transactionType}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {previewTransactions.length > 5 && (
                                        <p className="text-xs text-slate-500 text-center pt-2">
                                            Y {previewTransactions.length - 5} más...
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsImportModalOpen(false);
                                setSelectedFile(null);
                                setPreviewTransactions([]);
                                setSelectedBank("");
                            }}
                            className="text-slate-500 hover:text-white"
                        >
                            Cancelar
                        </Button>
                        {previewTransactions.length > 0 && (
                            <Button
                                onClick={() => confirmImportMutation.mutate()}
                                disabled={confirmImportMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px] h-12 rounded-xl"
                            >
                                {confirmImportMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Confirmar Importación
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Modal de Edición */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Transacción"
            >
                {editingTransaction && (
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Banco</label>
                                <Input
                                    value={editingTransaction.bankName || ""}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, bankName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Monto</label>
                                <Input
                                    type="number"
                                    value={editingTransaction.amount}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Fecha de Transacción</label>
                            <Input
                                type="date"
                                value={editingTransaction.transactionDate ? new Date(editingTransaction.transactionDate).toISOString().split('T')[0] : ""}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, transactionDate: e.target.value || null })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Descripción</label>
                            <Input
                                value={editingTransaction.description || ""}
                                onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Categoría</label>
                                <Input
                                    value={editingTransaction.category || ""}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tarjeta (últimos 4)</label>
                                <Input
                                    value={editingTransaction.cardLastFour || ""}
                                    onChange={(e) => setEditingTransaction({ ...editingTransaction, cardLastFour: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => updateMutation.mutate({ id: editingTransaction.id, data: editingTransaction })}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[120px]"
                                disabled={updateMutation.isPending}
                            >
                                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Guardar
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Confirmación de Eliminación */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
            >
                <div className="space-y-6 py-4">
                    <p className="text-slate-300">
                        ¿Estás seguro de que deseas eliminar esta transacción? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={deleteMutation.isPending}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-500 text-white min-w-[120px]"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Notificaciones */}
            <Modal
                isOpen={notificationModal.isOpen}
                onClose={() => setNotificationModal({ ...notificationModal, isOpen: false })}
                title={notificationModal.title}
            >
                <div className="space-y-6 py-4">
                    <div className={`flex items-start gap-4 p-4 rounded-xl ${notificationModal.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                        }`}>
                        {notificationModal.type === 'success' ? (
                            <Save className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                            <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                        <p className={notificationModal.type === 'success' ? 'text-emerald-200' : 'text-red-200'}>
                            {notificationModal.message}
                        </p>
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setNotificationModal({ ...notificationModal, isOpen: false })}
                            className="bg-slate-800 hover:bg-slate-700 text-white"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Detalles de Compra */}
            <Modal
                isOpen={isPurchaseDetailsModalOpen}
                onClose={() => {
                    setIsPurchaseDetailsModalOpen(false);
                    setSelectedPurchaseSummary(null);
                }}
                title="Detalles de Compra"
            >
                <div className="space-y-4 py-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-4">
                        <FileText className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-200/80 leading-relaxed">
                            Esta información fue extraída automáticamente del email de confirmación de compra.
                        </p>
                    </div>

                    {selectedPurchaseSummary && (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                            <div className="prose prose-invert prose-sm max-w-none text-slate-200">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => <h1 className="text-xl font-black text-white mb-3">{children}</h1>,
                                        h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2 mt-4">{children}</h2>,
                                        h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-2 mt-3">{children}</h3>,
                                        p: ({ children }) => <p className="text-slate-300 mb-2 leading-relaxed">{children}</p>,
                                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-3 text-slate-300">{children}</ul>,
                                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-3 text-slate-300">{children}</ol>,
                                        li: ({ children }) => <li className="text-slate-300">{children}</li>,
                                        strong: ({ children }) => <strong className="font-bold text-emerald-400">{children}</strong>,
                                        em: ({ children }) => <em className="italic text-slate-400">{children}</em>,
                                        code: ({ children }) => <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-400 text-sm font-mono">{children}</code>,
                                        pre: ({ children }) => <pre className="bg-slate-800 p-3 rounded-lg overflow-x-auto mb-3">{children}</pre>,
                                    }}
                                >
                                    {selectedPurchaseSummary}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={() => {
                                setIsPurchaseDetailsModalOpen(false);
                                setSelectedPurchaseSummary(null);
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-white"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modal de Transacciones por Día */}
            <Modal
                isOpen={dayDetailsModal.isOpen}
                onClose={() => setDayDetailsModal({ isOpen: false, date: '', transactions: [] })}
                title={`Transacciones del ${dayDetailsModal.date}`}
            >
                <div className="space-y-4 py-4">
                    {/* Total del día */}
                    <div className="rounded-2xl p-4" style={{ backgroundColor: `${palette.primary}1A`, borderWidth: '1px', borderStyle: 'solid', borderColor: `${palette.primary}33` }}>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider" style={{ color: palette.primary }}>Total del Día</span>
                            <span className="text-2xl font-black tabular-nums" style={{ color: palette.primary }}>
                                {new Intl.NumberFormat("es-CL", {
                                    style: "currency",
                                    currency: "CLP",
                                    minimumFractionDigits: 0
                                }).format(dayDetailsModal.transactions.reduce((sum, t) => sum + getAmountInCLP(t), 0))}
                            </span>
                        </div>
                        <div className="mt-1 text-xs" style={{ color: `${palette.primaryLight}99` }}>
                            {dayDetailsModal.transactions.length} {dayDetailsModal.transactions.length === 1 ? 'transacción' : 'transacciones'}
                        </div>
                    </div>

                    {/* Lista de transacciones */}
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {dayDetailsModal.transactions.map((t) => (
                            <div key={t.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:bg-slate-800/50 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-white truncate">{t.description || "Sin descripción"}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
                                            {t.bankName && (
                                                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${palette.accent}33`, borderWidth: '1px', borderStyle: 'solid', borderColor: `${palette.accent}4D`, color: palette.accent }}>
                                                    {t.bankName}
                                                </span>
                                            )}
                                            {t.category && (
                                                <span className="px-2 py-0.5 rounded" style={{ backgroundColor: `${palette.primary}33`, borderWidth: '1px', borderStyle: 'solid', borderColor: `${palette.primary}4D`, color: palette.primary }}>
                                                    {t.category}
                                                </span>
                                            )}
                                            {t.transactionDate && (
                                                <span className="text-slate-500">
                                                    {formatHourUTC(t.transactionDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-white tabular-nums">
                                            {new Intl.NumberFormat("es-CL", {
                                                style: "currency",
                                                currency: "CLP",
                                                minimumFractionDigits: 0
                                            }).format(getAmountInCLP(t))}
                                        </div>
                                        {t.currency === "USD" && (
                                            <div className="text-xs text-slate-500">
                                                ${parseFloat(t.amount).toFixed(2)} USD
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={() => setDayDetailsModal({ isOpen: false, date: '', transactions: [] })}
                            className="bg-slate-800 hover:bg-slate-700 text-white"
                        >
                            Cerrar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default Transactions;
