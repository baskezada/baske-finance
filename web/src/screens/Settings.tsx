import { useNavigate } from "react-router";
import { ArrowLeft, Palette, Check, Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "../components/ui/button";
import { useTheme, colorPalettes, backgroundPatterns } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";

function Settings() {
  const navigate = useNavigate();
  const { palette, setPalette, mode, setMode, pattern, setPattern } = useTheme();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver al Dashboard
          </Button>
          <div className="flex-1" />
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name || ""} className="w-8 h-8 rounded-full border-2 border-primary/30" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 text-sm">
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-black text-white mb-2">Ajustes</h1>
          <p className="text-slate-500">Personaliza tu experiencia en Baske Finance</p>
        </div>

        {/* Theme Mode Section */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${palette.primary}1A` }}>
              {mode === 'dark' ? (
                <Moon className="w-5 h-5" style={{ color: palette.primary }} />
              ) : (
                <Sun className="w-5 h-5" style={{ color: palette.primary }} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Tema</h2>
              <p className="text-sm text-slate-500">Cambia entre modo claro y oscuro</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('dark')}
              className={`group relative bg-slate-800/30 hover:bg-slate-800/50 border rounded-2xl p-6 transition-all ${
                mode === 'dark'
                  ? 'border-white/50 bg-slate-800/50'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {mode === 'dark' && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <Check className="w-4 h-4 text-slate-900" />
                </div>
              )}
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                  <Moon className="w-8 h-8" style={{ color: palette.primary }} />
                </div>
                <div className="text-center">
                  <h3 className={`text-lg font-black ${mode === 'dark' ? 'text-white' : 'text-slate-300'}`}>
                    Oscuro
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Modo predeterminado</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode('light')}
              className={`group relative bg-slate-800/30 hover:bg-slate-800/50 border rounded-2xl p-6 transition-all ${
                mode === 'light'
                  ? 'border-white/50 bg-slate-800/50'
                  : 'border-slate-700/50 hover:border-slate-600'
              }`}
            >
              {mode === 'light' && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                  <Check className="w-4 h-4 text-slate-900" />
                </div>
              )}
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-300 flex items-center justify-center">
                  <Sun className="w-8 h-8" style={{ color: palette.primary }} />
                </div>
                <div className="text-center">
                  <h3 className={`text-lg font-black ${mode === 'light' ? 'text-white' : 'text-slate-300'}`}>
                    Claro
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Mejor para el día</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Color Palette Section */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${palette.primary}1A` }}>
              <Palette className="w-5 h-5" style={{ color: palette.primary }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Paleta de Colores</h2>
              <p className="text-sm text-slate-500">Elige los colores que más te gusten</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {colorPalettes.map((p) => {
              const isSelected = palette.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPalette(p.id)}
                  className={`group relative bg-slate-800/30 hover:bg-slate-800/50 border rounded-2xl p-5 transition-all ${
                    isSelected
                      ? 'border-white/50 bg-slate-800/50'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-4 h-4 text-slate-900" />
                    </div>
                  )}

                  {/* Palette name */}
                  <div className="mb-4">
                    <h3 className={`text-lg font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {p.name}
                    </h3>
                  </div>

                  {/* Color swatches */}
                  <div className="grid grid-cols-5 gap-2">
                    <div
                      className="aspect-square rounded-lg shadow-lg"
                      style={{ backgroundColor: p.primary }}
                      title="Primary"
                    />
                    <div
                      className="aspect-square rounded-lg shadow-lg"
                      style={{ backgroundColor: p.primaryLight }}
                      title="Primary Light"
                    />
                    <div
                      className="aspect-square rounded-lg shadow-lg"
                      style={{ backgroundColor: p.primaryDark }}
                      title="Primary Dark"
                    />
                    <div
                      className="aspect-square rounded-lg shadow-lg"
                      style={{ backgroundColor: p.accent }}
                      title="Accent"
                    />
                    <div
                      className="aspect-square rounded-lg shadow-lg"
                      style={{ backgroundColor: p.accentLight }}
                      title="Accent Light"
                    />
                  </div>

                  {/* Preview badge */}
                  <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <div
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: `${p.primary}20`,
                          color: p.primary,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: `${p.primary}30`
                        }}
                      >
                        Preview
                      </div>
                      <div
                        className="px-3 py-1 rounded-lg text-xs font-bold"
                        style={{
                          backgroundColor: `${p.accent}20`,
                          color: p.accent,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: `${p.accent}30`
                        }}
                      >
                        Accent
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current selection info */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl shadow-lg"
                style={{ backgroundColor: palette.primary }}
              />
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-black">
                  Paleta Actual
                </p>
                <p className="text-lg font-black text-white">
                  {palette.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Background Pattern Section */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${palette.primary}1A` }}>
              <Sparkles className="w-5 h-5" style={{ color: palette.primary }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Patrón de Fondo</h2>
              <p className="text-sm text-slate-500">Añade un toque cute a tu dashboard</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {backgroundPatterns.map((p) => {
              const isSelected = pattern.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPattern(p.id)}
                  className={`group relative bg-slate-800/30 hover:bg-slate-800/50 border rounded-2xl p-5 transition-all ${
                    isSelected
                      ? 'border-white/50 bg-slate-800/50'
                      : 'border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      <Check className="w-4 h-4 text-slate-900" />
                    </div>
                  )}

                  {/* Pattern preview */}
                  <div className="aspect-square rounded-xl mb-3 border border-slate-700/50 overflow-hidden relative bg-slate-900">
                    {p.svg ? (
                      <div
                        className="w-full h-full"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(p.svg.replace(/currentColor/g, palette.primary))}")`,
                          backgroundRepeat: 'repeat',
                          backgroundSize: 'auto'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <span className="text-2xl">∅</span>
                      </div>
                    )}
                  </div>

                  {/* Pattern name */}
                  <div className="text-center">
                    <h3 className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {p.name}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current pattern info */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl border border-slate-700 overflow-hidden relative bg-slate-900">
                {pattern.svg ? (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(pattern.svg.replace(/currentColor/g, palette.primary))}")`,
                      backgroundRepeat: 'repeat',
                      backgroundSize: 'auto'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600">
                    <span className="text-lg">∅</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-black">
                  Patrón Actual
                </p>
                <p className="text-lg font-black text-white">
                  {pattern.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="bg-slate-900/30 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
          <h2 className="text-xl font-black text-white mb-6">Información de Usuario</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Nombre</label>
              <p className="text-white mt-1">{user?.name || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500">Email</label>
              <p className="text-white mt-1">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
