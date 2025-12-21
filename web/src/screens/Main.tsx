import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListTodo, Loader2, AlertCircle, Plus, Pencil, Save, DollarSign } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Modal } from "../components/ui/modal";
import { api } from "../api/client";

type Todo = { id: string; title: string; completed: boolean };

import { useAuth } from "../contexts/AuthContext";
import { LogOut } from "lucide-react";

function Main() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Todo | null>(null);
    const [taskTitle, setTaskTitle] = useState("");

    // Listar Tareas
    const { data: todos, isLoading, error } = useQuery({
        queryKey: ["todos"],
        queryFn: api.todos.list,
    });

    // Crear Tarea
    const createMutation = useMutation({
        mutationFn: (title: string) => api.todos.create(title),
        onSuccess: (newItem) => {
            queryClient.setQueryData(["todos"], (old: Todo[] | undefined) => {
                return [newItem, ...(old || [])];
            });
            closeModal();
        },
    });

    // Editar Tarea
    const updateMutation = useMutation({
        mutationFn: (todo: Todo) => api.todos.update(todo.id, { title: todo.title }),
        onSuccess: (updatedItem, variables) => {
            // Usamos 'variables' (lo que enviamos) para asegurar que tenemos los datos más recientes
            // y evitar problemas si la API no devuelve el objeto completo o correcto
            const finalItem = { ...variables, ...updatedItem };

            queryClient.setQueryData(["todos"], (old: Todo[] | undefined) => {
                return old?.map((t) => (t.id === finalItem.id ? finalItem : t));
            });
            closeModal();
        },
        onError: (e) => {
            alert("No se pudo guardar los cambios. Intenta nuevamente.");
            console.error(e);
        }
    });

    const handleSave = () => {
        if (!taskTitle.trim()) return;

        if (editingTask) {
            updateMutation.mutate({ ...editingTask, title: taskTitle });
        } else {
            createMutation.mutate(taskTitle);
        }
    };

    const openNewTask = () => {
        setEditingTask(null);
        setTaskTitle("");
        setIsModalOpen(true);
    };

    const openEditTask = (task: Todo) => {
        setEditingTask(task);
        setTaskTitle(task.title);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingTask(null);
        setTaskTitle("");
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="animate-pulse">Cargando tus tareas...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-red-400 gap-4">
                <AlertCircle className="w-12 h-12" />
                <p>Ha ocurrido un error al cargar los datos.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Reintentar</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-indigo-500/30">
            <title>Dashboard - Baske Finance</title>

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-800 pb-8">
                    <div className="flex items-center gap-4">
                        {user?.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name || ""} className="w-12 h-12 rounded-full border-2 border-indigo-500/30" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border-2 border-indigo-500/20">
                                {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h1 className="text-2xl font-black text-white flex items-center gap-2">
                                Hola, <span className="text-indigo-400">{user?.name || user?.email?.split('@')[0]}</span>
                            </h1>
                            <p className="text-slate-500 text-sm">
                                Gestiona tus actividades hoy
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/transactions')}
                            className="flex-1 md:flex-none border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                        >
                            <DollarSign className="w-5 h-5 mr-2" />
                            Transacciones
                        </Button>
                        <Button
                            onClick={openNewTask}
                            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nueva Tarea
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => logout().then(() => navigate('/login'))}
                            className="border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white"
                        >
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>
                </header>

                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <ListTodo className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold uppercase tracking-widest text-[10px]">Mis Tareas Pendientes</span>
                </div>

                {/* List */}
                <div className="grid gap-4">
                    {todos?.slice(0, 10).map((t) => (
                        <div
                            key={t.id}
                            onClick={() => navigate(`/task/${t.id}`)}
                            className="group p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/30 hover:bg-slate-900 transition-all duration-300 flex items-center gap-4 transform hover:-translate-y-1 cursor-pointer"
                        >
                            <div className={`p-2 rounded-full ${t.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10'} transition-colors`}>
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-medium text-lg ${t.completed ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-white'} transition-colors`}>
                                    {t.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">
                                    {t.completed ? 'Completada' : 'Pendiente'}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditTask(t)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal de Creación/Edición */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingTask ? "Editar Tarea" : "Nueva Tarea"}
            >
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300">Título de la tarea</label>
                        <Input
                            placeholder="Ej: Revisar estado de cuenta..."
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" onClick={closeModal} className="text-slate-400 hover:text-white">
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[120px]"
                        >
                            {(createMutation.isPending || updateMutation.isPending) ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

export default Main;