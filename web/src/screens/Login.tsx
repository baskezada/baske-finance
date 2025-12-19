import { Button } from '../components/ui/button'
import { Link, useNavigate } from 'react-router'
import { useState } from 'react'

export default function Login() {
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setTimeout(() => setLoading(false), 2000)
        navigate('/main')
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <title>Iniciar Sesión - Baske Finance</title>
            <meta name="description" content="Accede a tu cuenta de Baske Finance para gestionar tus gastos automáticamente." />
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-8">
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-bold text-white">Bienvenido de nuevo</h2>
                    <p className="text-slate-400">Ingresa tus credenciales para acceder</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
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

                <div className="text-center">
                    <Link to="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                        &larr; Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    )
}
