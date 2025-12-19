import { Button } from '../components/ui/button'
import { Link } from 'react-router'
import { Mail, Receipt, ChartPie, ArrowRight, ShieldCheck } from 'lucide-react'

export default function Landing() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-sans">
            <title>Baske Finance - Finanzas automáticas desde Gmail</title>
            <meta name="description" content="Automatiza tus finanzas conectando tu Gmail. Baske Finance lee tus recibos y organiza tus gastos automáticamente." />

            {/* Navbar */}
            <nav className="fixed w-full z-50 p-6 backdrop-blur-md bg-slate-950/50 border-b border-slate-800/50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent">
                        Baske.
                    </div>
                    <div className="flex gap-4">
                        <Link to="/login">
                            <Button variant="ghost" className="text-slate-300 hover:text-white">Iniciar Sesión</Button>
                        </Link>
                        <Link to="/login">
                            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                                Empezar ahora
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-32 pb-20 px-6">
                <div className="max-w-5xl mx-auto text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Nueva integración con Gmail API
                    </div>

                    <h1 className="text-6xl md:text-7xl font-black tracking-tight text-white leading-tight">
                        Tus finanzas, <br />
                        <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-sky-400 bg-clip-text text-transparent">
                            directo desde tu Inbox
                        </span>
                    </h1>

                    <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Olvídate de ingresar gastos manualmente. Baske Finance lee tus correos de confirmación de compra y organiza tus finanzas automáticamente.
                    </p>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <Link to="/login">
                            <Button size="lg" className="h-14 px-8 text-lg bg-white text-slate-950 hover:bg-slate-200 font-bold shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                                Conectar con Gmail
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </Link>
                        <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors">
                            Ver demo
                        </Button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="max-w-6xl mx-auto mt-32 grid md:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Mail className="w-8 h-8 text-indigo-400" />}
                        title="Lectura de Emails"
                        description="Conectamos seguramente con tu Gmail para identificar correos de recibos, transferencias y confirmaciones de pago."
                    />
                    <FeatureCard
                        icon={<Receipt className="w-8 h-8 text-sky-400" />}
                        title="Extracción Inteligente"
                        description="Nuestros algoritmos extraen el monto, fecha y comercio de cada correo, sin importar el formato."
                    />
                    <FeatureCard
                        icon={<ChartPie className="w-8 h-8 text-emerald-400" />}
                        title="Categorización Auto"
                        description="Tus gastos se clasifican automáticamente para que sepas exactamente en qué se va tu dinero cada mes."
                    />
                </div>

                {/* Trust Section */}
                <div className="mt-32 text-center space-y-12">
                    <p className="text-slate-500 font-medium">Tus datos están seguros y encriptados</p>
                    <div className="flex justify-center items-center gap-2 text-slate-400">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        <span>Solo lectura • Encriptación AES-256 • Privacidad primero</span>
                    </div>
                </div>
            </main>
        </div>
    )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="group p-8 rounded-3xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 transition-all duration-300">
            <div className="mb-6 p-4 rounded-2xl bg-slate-950 inline-block border border-slate-800 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-slate-400 leading-relaxed">
                {description}
            </p>
        </div>
    )
}
