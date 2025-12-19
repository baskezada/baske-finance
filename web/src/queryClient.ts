import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: (failureCount, error: any) => {
                // No reintentar errores de auth
                if (error?.status === 401 || error?.status === 403) return false;
                return failureCount < 2;
            },
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});