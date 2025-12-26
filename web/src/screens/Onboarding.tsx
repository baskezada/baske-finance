import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useTheme, colorPalettes, backgroundPatterns } from "../contexts/ThemeContext";
import { api } from "../api/client";
import { Check, Mail, Layout, Palette, Settings, Plus, X, Sun, Moon } from "lucide-react";

export default function Onboarding() {
    const { user } = useAuth();
    const { palette, setPalette, mode, setMode, pattern, setPattern } = useTheme();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [name, setName] = useState(user?.name || "");
    const [trackingMode, setTrackingMode] = useState<string>("");
    const [selectedCategories, setSelectedCategories] = useState<string[]>([
        "Comida", "Transporte", "Suscripciones", "Compras", "Servicios", "Salario", "Transferencias"
    ]);
    const [customCategory, setCustomCategory] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user?.onboardingCompleted) {
            navigate("/dashboard");
        }
    }, [user, navigate]);

    const handleNext = async () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            await finishOnboarding();
        }
    };

    const finishOnboarding = async () => {
        setLoading(true);
        try {
            // 1. Save personalization and tracking mode
            await api.auth.updateOnboarding({
                name,
                theme: mode,
                color: palette.id,
                background: pattern.id,
                trackingMode,
                onboardingCompleted: true
            });

            // 2. Save categories
            for (const cat of selectedCategories) {
                await api.categories.create(cat);
            }

            // 3. Refresh user data (AuthContext uses useQuery, we might need to invalidate or refetch)
            // For now, let's assume a hard refresh or navigate will trigger it
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Error completing onboarding:", error);
        } finally {
            setLoading(false);
        }
    };

    const addCustomCategory = () => {
        if (customCategory && !selectedCategories.includes(customCategory)) {
            setSelectedCategories([...selectedCategories, customCategory]);
            setCustomCategory("");
        }
    };

    const removeCategory = (cat: string) => {
        setSelectedCategories(selectedCategories.filter(c => c !== cat));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 bg-[var(--background-pattern)]">
            <div className="max-w-2xl w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8">
                {/* Stepper Header */}
                <div className="flex justify-between items-center mb-12">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center flex-1 last:flex-none">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${step >= s ? "bg-primary" : "bg-slate-800 text-slate-500"
                                }`}>
                                {step > s ? <Check className="w-5 h-5" /> : s}
                            </div>
                            {s < 3 && (
                                <div className={`h-1 flex-1 mx-4 rounded-full transition-all duration-300 ${step > s ? "bg-primary" : "bg-slate-800"
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="min-h-[400px]">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2 mb-8">
                                <h1 className="text-3xl font-bold">¡Hola! Vamos a personalizar tu experiencia</h1>
                                <p className="text-slate-400">Cuéntanos cómo te llamas y elige tu estilo.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300">¿Cómo quieres que te llamemos?</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Tu nombre"
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-300">Elige tu color favorito</label>
                                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                                    {colorPalettes.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPalette(p.id)}
                                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative ${palette.id === p.id ? "border-white scale-110" : "border-transparent"
                                                }`}
                                            style={{ backgroundColor: p.primary, color: 'white' }}
                                            title={p.name}
                                        >
                                            {palette.id === p.id && (
                                                <Check className="w-5 h-5 animate-in zoom-in-50 duration-300" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-medium text-slate-300">Un patrón para el fondo</label>
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                                    {backgroundPatterns.map((p) => (
                                        <button
                                            key={p.id}
                                            onClick={() => setPattern(p.id)}
                                            className={`py-2 px-3 rounded-lg border text-xs transition-all ${pattern.id === p.id ? "bg-primary border-white" : "bg-slate-800 border-slate-700 text-slate-400"
                                                }`}
                                        >
                                            {p.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 group transition-all hover:border-slate-600">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-200">Apariencia</p>
                                        <p className="text-xs text-slate-400">Elige tu modo preferido</p>
                                    </div>
                                </div>
                                <div
                                    className="flex p-1 bg-slate-950 rounded-xl border border-slate-800 w-36 relative cursor-pointer group/toggle"
                                    onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
                                >
                                    <div
                                        className={`absolute inset-1 w-[calc(50%-4px)] bg-primary rounded-lg transition-all duration-300 shadow-lg ${mode === 'dark' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                                            }`}
                                    />
                                    <button
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold z-10 transition-colors ${mode === 'light' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <Sun className="w-3.5 h-3.5" />
                                        Claro
                                    </button>
                                    <button
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold z-10 transition-colors ${mode === 'dark' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        <Moon className="w-3.5 h-3.5" />
                                        Oscuro
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2 mb-8">
                                <h1 className="text-3xl font-bold">¿Cómo quieres registrar tus gastos?</h1>
                                <p className="text-slate-400">Selecciona el modo que mejor se adapte a ti.</p>
                            </div>

                            <div className="grid gap-4">
                                <button
                                    onClick={() => setTrackingMode("gmail")}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all ${trackingMode === "gmail" ? "bg-primary/20 border-primary" : "bg-slate-800 border-slate-700 hover:border-slate-500"
                                        }`}
                                >
                                    <div className="flex items-center gap-4 mb-2">
                                        <Mail className="w-6 h-6 text-primary" />
                                        <h3 className="text-xl font-bold uppercase tracking-wider">Conexión Directa con Gmail</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm">Escaneamos automáticamente tus correos de confirmación de bancos. <span className="text-primary-light font-semibold">(2 meses gratis, luego Premium)</span></p>
                                </button>

                                <button
                                    onClick={() => setTrackingMode("forward")}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden ${trackingMode === "forward" ? "bg-primary/20 border-primary" : "bg-slate-800 border-slate-700 hover:border-slate-500 opacity-60"
                                        }`}
                                >
                                    <div className="flex items-center gap-4 mb-2">
                                        <Layout className="w-6 h-6 text-emerald-400" />
                                        <h3 className="text-xl font-bold uppercase tracking-wider">Redirección de Correos</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm">Reenvía tus correos a una dirección única que te daremos. <span className="text-emerald-300 font-semibold">(Próximamente)</span></p>
                                </button>

                                <button
                                    onClick={() => setTrackingMode("manual")}
                                    className={`p-6 rounded-2xl border-2 text-left transition-all ${trackingMode === "manual" ? "bg-primary/20 border-primary" : "bg-slate-800 border-slate-700 hover:border-slate-500"
                                        }`}
                                >
                                    <div className="flex items-center gap-4 mb-2">
                                        <Settings className="w-6 h-6 text-slate-400" />
                                        <h3 className="text-xl font-bold uppercase tracking-wider">Modo Manual / Importación</h3>
                                    </div>
                                    <p className="text-slate-400 text-sm">Registra tus gastos manualmente o importa archivos Excel/EML a tu ritmo.</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center space-y-2 mb-8">
                                <h1 className="text-3xl font-bold">Tus Categorías</h1>
                                <p className="text-slate-400">Gestionaremos tus gastos basándonos en estas categorías.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customCategory}
                                        onChange={(e) => setCustomCategory(e.target.value)}
                                        placeholder="Nueva categoría (ej: Hobbies)"
                                        className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-primary"
                                        onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                                    />
                                    <Button onClick={addCustomCategory} className="bg-primary hover:bg-primary-dark">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-2 max-h-[250px] overflow-y-auto p-2 border border-slate-800 rounded-xl bg-slate-950/50">
                                    {selectedCategories.map((cat) => (
                                        <div
                                            key={cat}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/30 border border-primary/50 rounded-full text-sm animate-in zoom-in-75 duration-300"
                                        >
                                            {cat}
                                            <button onClick={() => removeCategory(cat)}>
                                                <X className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    {selectedCategories.length === 0 && (
                                        <p className="text-slate-500 text-sm w-full text-center py-4">Añade al menos una categoría</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-xl text-xs text-emerald-400 flex gap-3">
                                <Check className="w-5 h-5 flex-shrink-0" />
                                <p>Nuestra IA intentará encajar tus gastos automáticamente en estas categorías. Si no encuentra una coincidencia clara, usará "Otros".</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4 pt-8">
                    {step > 1 && (
                        <Button
                            variant="outline"
                            className="flex-1 h-12 text-lg border-slate-700 hover:bg-slate-800"
                            onClick={() => setStep(step - 1)}
                            disabled={loading}
                        >
                            Atrás
                        </Button>
                    )}
                    <Button
                        className={`flex-[2] h-12 text-lg font-bold bg-primary hover:bg-primary-dark transition-all ${step === 2 && !trackingMode ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        onClick={handleNext}
                        disabled={loading || (step === 2 && !trackingMode) || (step === 3 && selectedCategories.length === 0)}
                    >
                        {loading ? "Guardando..." : step === 3 ? "¡Empezar!" : "Continuar"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
