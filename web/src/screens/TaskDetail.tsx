import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { api } from "../api/client";

type Todo = { id: string; title: string; completed: boolean };

export default function TaskDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const taskId = id;

    const [title, setTitle] = useState("");
    const [isCompleted, setIsCompleted] = useState(false);

    // Fetch task data, trying cache first
    const { data: task, isLoading, error } = useQuery({
        queryKey: ["todos", taskId],
        queryFn: () => api.todos.get(taskId),
        initialData: () => {
            const cachedList = queryClient.getQueryData<Todo[]>(["todos"]);
            return cachedList?.find(t => t.id === taskId);
        }
    });

    // Sync state with data
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setIsCompleted(task.completed);
        }
    }, [task]);

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: (data: { id: string; title: string; completed: boolean }) =>
            api.todos.update(data.id, { title: data.title, completed: data.completed }),
        onSuccess: (updatedItem, variables) => {
            // Robust merge of variables + response
            const finalItem = { ...variables, ...updatedItem };

            // Update specific item cache
            queryClient.setQueryData(["todos", taskId], finalItem);

            // Update list cache
            queryClient.setQueryData(["todos"], (old: Todo[] | undefined) => {
                if (!old) return undefined;
                return old.map(t => t.id === finalItem.id ? finalItem : t);
            });

            navigate("/main"); // Go back after save
        },
        onError: (e) => {
            alert("No se pudo guardar. Intenta de nuevo.");
            console.error(e);
        }
    });

    const handleSave = () => {
        if (!task || !title.trim()) return;
        updateMutation.mutate({
            id: task.id,
            title,
            completed: isCompleted
        });
    };

    const toggleCompleted = () => setIsCompleted(!isCompleted);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                <p>Cargando tarea...</p>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-400 gap-4">
                <AlertCircle className="w-12 h-12" />
                <p>Tarea no encontrada o error de conexión.</p>
                <Button variant="outline" onClick={() => navigate("/main")}>Volver al inicio</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-indigo-500/30 flex items-center justify-center">
            <div className="w-full max-w-2xl space-y-8">
                {/* Header / Nav */}
                <div className="flex items-center gap-4 text-slate-400 hover:text-white transition-colors cursor-pointer w-fit" onClick={() => navigate("/main")}>
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-medium">Volver a mis tareas</span>
                </div>

                {/* Card */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-xl shadow-black/20">
                    <div className="space-y-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">Detalles de la Tarea</h1>
                                <p className="text-slate-500">Edita la información de tu tarea seleccionada.</p>
                            </div>
                            <div
                                onClick={toggleCompleted}
                                className={`cursor-pointer rounded-full p-2 transition-all ${isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500 hover:text-indigo-400'}`}
                            >
                                {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <Circle className="w-8 h-8" />}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Título</label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-slate-950/50 border-slate-800 focus:border-indigo-500 h-12 text-lg"
                                placeholder="Nombre de la tarea..."
                            />
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={updateMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 w-full md:w-auto h-12 px-8 text-lg"
                            >
                                {updateMutation.isPending ? (
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                ) : (
                                    <Save className="w-5 h-5 mr-2" />
                                )}
                                Guardar Cambios
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
