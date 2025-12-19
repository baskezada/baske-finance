// api/client.ts
import { createHttpClient } from "./http";

const http = createHttpClient({
    baseUrl: import.meta.env.VITE_API_URL,
});

export type User = {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
};

export const api = {
    auth: {
        me: () => http.get<User | null>("/auth/me"),
        register: (data: any) => http.post<User>("/auth/register", data),
        login: (data: any) => http.post<User>("/auth/login", data),
        logout: () => http.post<{ success: boolean }>("/auth/logout"),
    },
    todos: {
        list: () => http.get<Todo[]>("/todos"),
        get: (id: string) => http.get<Todo>(`/todos/${id}`),
        create: (title: string) => http.post<Todo>("/todos", { title }),
        update: (id: string, data: Partial<Todo>) => http.put<Todo>(`/todos/${id}`, data),
        delete: (id: string) => http.del<{ success: boolean }>(`/todos/${id}`),
    },
};

type Todo = { id: string; title: string; completed: boolean };