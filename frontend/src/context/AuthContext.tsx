import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

interface User {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    location?: { state?: string; district?: string; tahsil?: string };
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (phone: string, password: string) => Promise<void>;
    register: (data: {
        name: string;
        phone: string;
        password: string;
        email?: string;
        location?: { state?: string; district?: string; tahsil?: string };
    }) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(authService.getToken());
    const [loading, setLoading] = useState(true);

    // Load user on mount if token exists
    useEffect(() => {
        const loadUser = async () => {
            if (authService.isLoggedIn()) {
                try {
                    const data = await authService.getMe();
                    setUser(data.user);
                    setToken(authService.getToken());
                } catch {
                    authService.logout();
                    setUser(null);
                    setToken(null);
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const login = useCallback(async (phone: string, password: string) => {
        const data = await authService.login(phone, password);
        setUser(data.user);
        setToken(data.token);
    }, []);

    const register = useCallback(
        async (regData: {
            name: string;
            phone: string;
            password: string;
            email?: string;
            location?: { state?: string; district?: string; tahsil?: string };
        }) => {
            const data = await authService.register(regData);
            setUser(data.user);
            setToken(data.token);
        },
        []
    );

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setToken(null);
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!user,
                loading,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
