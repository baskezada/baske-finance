import { useState } from "react";
import { Button } from "./ui/button";
import { Modal } from "./ui/modal";
import { api } from "../api/client";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertCircle, FileText, CreditCard, Check } from "lucide-react";

export default function EmlUploadButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const queryClient = useQueryClient();

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setImported(false);
    try {
      const res = await api.gmail.uploadEml(file);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async () => {
    if (!result || !result.parsed) return;
    setConfirming(true);
    setError(null);
    try {
      await api.gmail.confirmEmlImport(result.type, result.parsed);
      setImported(true);
      // Invalidate transactions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e: any) {
      setError(e.message || "Import confirmation failed");
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setError(null);
    setFile(null);
    setImported(false);
  };

  const getResultIcon = () => {
    if (!result) return null;
    if (imported) return <CheckCircle className="w-6 h-6 text-emerald-500" />;
    if (result.type === "BANK_TRANSACTION") return <CreditCard className="w-6 h-6 text-emerald-500" />;
    if (result.type === "PURCHASE_INFORMATION") return <FileText className="w-6 h-6 text-blue-500" />;
    return <AlertCircle className="w-6 h-6 text-slate-500" />;
  };

  const getResultMessage = () => {
    if (!result) return null;

    if (imported) {
      if (result.type === "BANK_TRANSACTION") {
        return {
          title: "Transacción Importada",
          description: "La transacción fue guardada exitosamente en tu historial.",
          color: "emerald"
        };
      }
      if (result.type === "PURCHASE_INFORMATION") {
        return {
          title: "Detalles Vinculados",
          description: "Los detalles de compra fueron agregados a la transacción.",
          color: "emerald"
        };
      }
    }

    if (result.type === "BANK_TRANSACTION") {
      return {
        title: "Transacción Bancaria Detectada",
        description: result.parsed ? "Revisa los detalles y confirma para importar." : "No se pudo extraer información de transacción.",
        color: "emerald"
      };
    }

    if (result.type === "PURCHASE_INFORMATION") {
      if (result.potentialMatch) {
        return {
          title: "Información de Compra Extraída",
          description: result.message || `Se encontraron ${result.matchCount} transacción(es) coincidente(s).`,
          color: "blue"
        };
      } else {
        return {
          title: "Información de Compra Extraída",
          description: "No se encontró una transacción coincidente en la ventana de tiempo (±10 min).",
          color: "yellow"
        };
      }
    }

    return {
      title: "Email Descartado",
      description: "Este email no es una transacción bancaria ni confirmación de compra.",
      color: "slate"
    };
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300"
      >
        <Upload className="w-4 h-4 mr-2" />
        Importar .eml
      </Button>

      <Modal title="Importar Email (.eml)" isOpen={isOpen} onClose={handleClose}>
        <div className="space-y-6 py-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex gap-4">
            <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Sube un archivo .eml de transacción bancaria o confirmación de compra. La IA lo clasificará y procesará automáticamente.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Archivo .eml</label>
            <input
              type="file"
              accept=".eml"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setResult(null);
                setError(null);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-400">Error</p>
                <p className="text-xs text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {result && (
            <div className={`bg-${getResultMessage()?.color}-500/10 border border-${getResultMessage()?.color}-500/20 rounded-xl p-4`}>
              <div className="flex gap-3 items-start mb-3">
                {getResultIcon()}
                <div>
                  <p className="text-sm font-bold text-white">{getResultMessage()?.title}</p>
                  <p className="text-xs text-slate-300/80 mt-1">{getResultMessage()?.description}</p>
                </div>
              </div>

              {result.parsed && (
                <div className="bg-slate-900/50 rounded-lg p-3 mt-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Detalles extraídos</p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(result.parsed, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="ghost" onClick={handleClose} className="text-slate-500 hover:text-white">
              Cerrar
            </Button>

            {!result && (
              <Button
                onClick={submit}
                disabled={!file || loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Analizando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Analizar
                  </>
                )}
              </Button>
            )}

            {result && result.parsed && !imported && (
              <Button
                onClick={confirmImport}
                disabled={confirming}
                className="bg-emerald-600 hover:bg-emerald-500 text-white min-w-[140px]"
              >
                {confirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar Importación
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}