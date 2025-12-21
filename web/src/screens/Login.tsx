import { Button } from '../components/ui/button'
import { Link, useNavigate } from 'react-router'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()
    const { login } = useAuth()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            await login({ email, password })
            navigate('/dashboard')
        } catch (err: any) {
            setError(err.message || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <title>Iniciar Sesión - Baske Finance</title>
            <meta name="description" content="Accede a tu cuenta de Baske Finance para gestionar tus gastos automáticamente." />

            <div className="max-w-md w-full relative">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/')}
                    className="absolute -top-12 left-0 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Volver
                </Button>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-3xl font-bold text-white">Bienvenido de nuevo</h2>
                        <p className="text-slate-400">Ingresa tus credenciales para acceder</p>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Iniciar Sesión'}
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-slate-800"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-900 px-2 text-slate-500">O continúa con</span>
                        </div>
                    </div>

                    <a
                        href={`${API_URL}/auth/google/login`}
                        className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-lg transition-all duration-300"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                            />
                        </svg>
                        Google
                    </a>

                    <p className="text-sm text-slate-400">
                        ¿No tienes cuenta?{' '}
                        <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
                            Regístrate
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
