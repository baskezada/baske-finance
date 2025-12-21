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

export type Transaction = {
    id: string;
    userId: string;
    bankId: string;
    bankName: string | null;
    amount: string;
    currency: string;
    category: string | null;
    description: string | null;
    cardLastFour: string | null;
    transactionDate: string | null;
    transactionType: 'cargo' | 'abono';
    createdAt: string;
};

export type Bank = {
    id: string;
    name: string;
    createdAt: string;
};

export type ImportJob = {
    id: string;
    userId: string;
    status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed';
    progress: number;
    totalItems: number;
    processedItems: number;
    error: string | null;
    createdAt: string;
    updatedAt: string;
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
    transactions: {
        list: (filters?: { startDate?: string; endDate?: string; category?: string; bankName?: string }) => {
            const params = new URLSearchParams();
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);
            if (filters?.category) params.append('category', filters.category);
            if (filters?.bankName) params.append('bankName', filters.bankName);
            const query = params.toString();
            return http.get<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
        },
        update: (id: string, data: Partial<Transaction>) => http.put<Transaction>(`/transactions/${id}`, data),
        delete: (id: string) => http.del<{ success: boolean }>(`/transactions/${id}`),
    },
    banks: {
        list: () => http.get<Bank[]>("/banks"),
        create: (name: string) => http.post<Bank>("/banks", { name }),
    },
    gmail: {
        import: (data: { month: number; year: number }) => http.post<{ success: boolean; jobId: string }>("/auth/gmail/import", data),
        getImportStatus: (jobId: string) => http.get<ImportJob>(`/auth/gmail/import/status/${jobId}`),
        cancelImport: (jobId: string) => http.post<{ success: boolean }>(`/auth/gmail/import/cancel/${jobId}`),
        importExcel: async (file: File, bankId: string) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bankId', bankId);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/transactions/import-excel`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });
            if (!res.ok) throw new Error("Failed to import Excel");
            return res.json();
        },
        confirmExcelImport: (transactions: any[], bankId: string) =>
            http.post<{ success: boolean; imported: number }>("/transactions/import-excel/confirm", { transactions, bankId }),
    },
};


type Todo = { id: string; title: string; completed: boolean };