// api/http.ts
export class ApiError extends Error {
    public status?: number;
    public details?: unknown;

    constructor(message: string, status?: number, details?: unknown) {
        super(message);
        this.status = status;
        this.details = details;
    }
}

type HttpOptions = RequestInit & { params?: Record<string, string | number | boolean> };

export function createHttpClient(opts: {
    baseUrl: string;
}) {
    const { baseUrl } = opts;

    async function request<T>(path: string, options: HttpOptions = {}): Promise<T> {
        const url = new URL(path, baseUrl);

        if (options.params) {
            Object.entries(options.params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
        }

        const res = await fetch(url.toString(), {
            ...options,
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(options.headers ?? {}),
            },
        });

        const contentType = res.headers.get("content-type") ?? "";
        const body = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text().catch(() => null);

        if (!res.ok) {
            throw new ApiError(
                (body && (body.message || body.error)) || `Request failed: ${res.status}`,
                res.status,
                body
            );
        }

        return body as T;
    }

    return {
        get: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: "GET" }),
        post: <T>(path: string, data?: unknown, options?: HttpOptions) =>
            request<T>(path, { ...options, method: "POST", body: data ? JSON.stringify(data) : undefined }),
        put: <T>(path: string, data?: unknown, options?: HttpOptions) =>
            request<T>(path, { ...options, method: "PUT", body: data ? JSON.stringify(data) : undefined }),
        patch: <T>(path: string, data?: unknown, options?: HttpOptions) =>
            request<T>(path, { ...options, method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
        del: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: "DELETE" }),
    };
}
