import React, { createContext, useContext } from "react";
import { api, type User } from "../api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: any) => Promise<void>;
    register: (data: any) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    const { data: user, isLoading: loading } = useQuery({
        queryKey: ["auth-me"],
        queryFn: async () => {
            try {
                return await api.auth.me();
            } catch (err) {
                return null;
            }
        },
        retry: false,
        staleTime: Infinity,
    });

    const login = async (data: any) => {
        const loggedUser = await api.auth.login(data);
        queryClient.setQueryData(["auth-me"], loggedUser);
    };

    const register = async (data: any) => {
        const registeredUser = await api.auth.register(data);
        queryClient.setQueryData(["auth-me"], registeredUser);
    };

    const logout = async () => {
        await api.auth.logout();
        queryClient.setQueryData(["auth-me"], null);
        queryClient.clear();
    };

    return (
        <AuthContext.Provider value={{ user: user ?? null, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
