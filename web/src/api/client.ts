// api/client.ts
import { createHttpClient } from "./http";

const http = createHttpClient({
    baseUrl: import.meta.env.VITE_API_URL,
    getToken: () => localStorage.getItem("token"),
});

export const api = {
    users: {
        me: () => http.get<{ id: string; email: string }>("/users/me"),
        list: (page: number) => http.get<{ items: any[]; total: number }>("/users", { params: { page } }),
    },
    auth: {
        login: (email: string, password: string) =>
            http.post<{ token: string }>("/auth/login", { email, password }),
    },
    todos: {
        list: () => http.get<Todo[]>("/todos"),
        get: (id: number) => http.get<Todo>(`/todos/${id}`),
        create: (title: string) => http.post<Todo>("/todos", { title }),
        update: (id: number, data: Partial<Todo>) => http.put<Todo>(`/todos/${id}`, data),
        delete: (id: number) => http.del<{ success: boolean }>(`/todos/${id}`),
    },
};

type Todo = { id: number; title: string; completed: boolean };