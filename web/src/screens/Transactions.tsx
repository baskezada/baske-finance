import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Download, DollarSign, Wallet, TrendingUp, CreditCard, Pencil, Trash2, Save, Filter, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/modal";
import { api, type Transaction } from "../api/client";
import { Input } from "../components/ui/input";
import { SpendingOverTime } from "../components/charts/SpendingOverTime";
import { CategoryPieChart } from "../components/charts/CategoryPieChart";
import { BankBarChart } from "../components/charts/BankBarChart";
import { MetricCard } from "../components/MetricCard";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";

function Transactions() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [selectedBank, setSelectedBank] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewTransactions, setPreviewTransactions] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingTransactionId, setDeletingTransactionId] = useState<string | null>(null);
    const [notificationModal, setNotificationModal] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'success'
    });

    // Filters
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        category: "",
        bankName: ""
    });

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ["transactions", filters],
        queryFn: () => api.transactions.list(filters),
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

    const confirmDelete = () => {
        if (deletingTransactionId) {
            deleteMutation.mutate(deletingTransactionId);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
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

    // Calculate metrics
    const metrics = useMemo(() => {
        const total = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const average = transactions.length > 0 ? total / transactions.length : 0;
        const bankSpending = transactions.reduce((acc, t) => {
            const bank = t.bankName || "Desconocido";
            acc[bank] = (acc[bank] || 0) + parseFloat(t.amount);
            return acc;
        }, {} as Record<string, number>);
        const topBank = Object.entries(bankSpending).sort((a, b) => b[1] - a[1])[0];

        return {
            total,
            average,
            count: transactions.length,
            topBank: topBank ? topBank[0] : "N/A"
        };
    }, [transactions]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                <p className="animate-pulse">Cargando dashboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
            <title>Dashboard - Baske Finance</title>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
                    <div className="flex items-center gap-4">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name || ""} className="w-12 h-12 rounded-full border-2 border-emerald-500/30" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border-2 border-emerald-500/20">
                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-white flex items-center gap-2">
                                Hola, <span className="text-emerald-400">{user?.name || user?.email?.split('@')[0]}</span>
                            </h1>
                            <p className="text-slate-500 text-sm">
                                Dashboard Financiero
                            </p>
                        </div>
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => logout().then(() => navigate('/login'))}
                        className="border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                    >
                        <LogOut className="w-5 h-5 mr-2" />
                        Salir
                    </Button>
                </header>

                {/* Filters */}
                <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Filter className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-lg font-black text-white">Filtros</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Desde</label>
                            <Input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Hasta</label>
                            <Input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Categoría</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all"
                            >
                                <option value="">Todas</option>
                                {uniqueCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 mb-2 block">Banco</label>
                            <select
                                value={filters.bankName}
                                onChange={(e) => setFilters({ ...filters, bankName: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500/50 outline-none transition-all"
                            >
                                <option value="">Todos</option>
                                {uniqueBanks.map(bank => (
                                    <option key={bank} value={bank}>{bank}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Gastado"
                        value={new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(metrics.total)}
                        icon={<DollarSign className="w-5 h-5" />}
                    />
                    <MetricCard
                        title="Promedio"
                        value={new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(metrics.average)}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitle="por transacción"
                    />
                    <MetricCard
                        title="Transacciones"
                        value={metrics.count.toString()}
                        icon={<CreditCard className="w-5 h-5" />}
                    />
                    <MetricCard
                        title="Banco Principal"
                        value={metrics.topBank}
                        icon={<Wallet className="w-5 h-5" />}
                    />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SpendingOverTime transactions={transactions} />
                    <CategoryPieChart transactions={transactions} />
                </div>

                <BankBarChart transactions={transactions} />

                {/* Table */}
                <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/30 backdrop-blur-xl shadow-2xl">
                    <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                        <h2 className="text-lg font-black text-white">Transacciones Recientes</h2>
                        <Button
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl h-auto"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Importar Historial
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900 border-b border-slate-800">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha Gasto</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Fecha Importación</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Banco / Origen</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Descripción / Comercio</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Monto</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-slate-600">
                                            <div className="flex flex-col items-center gap-4">
                                                <Wallet className="w-12 h-12 opacity-20" />
                                                <p>No se encontraron transacciones.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((t) => (
                                        <tr key={t.id} className="group hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-5 align-middle">
                                                <span className="text-sm font-medium text-white">{t.transactionDate ? formatDate(t.transactionDate) : "---"}</span>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <span className="text-xs font-medium text-slate-500">{formatDate(t.createdAt)}</span>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                                        <DollarSign className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{t.bankName || "Banco"}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-200 font-medium">{t.description || "Sin descripción"}</span>
                                                    {t.category && (
                                                        <span className="text-[10px] uppercase font-black tracking-tighter text-slate-500 mt-1">{t.category}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 align-middle text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className={`text-lg font-black tabular-nums ${t.transactionType === 'abono' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {t.transactionType === 'abono' ? '+' : '-'} {new Intl.NumberFormat("es-AR", { style: "currency", currency: t.currency }).format(parseFloat(t.amount))}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] uppercase font-black tracking-wider ${t.transactionType === 'abono' ? 'text-emerald-500/60' : 'text-red-500/60'}`}>
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
                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800"
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
        </div>
    );
}

export default Transactions;
