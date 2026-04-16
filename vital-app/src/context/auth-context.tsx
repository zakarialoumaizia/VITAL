import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { CONFIG } from '@/config';

// ─── Browser Auth Setup ──────────────────────────────────────────────────────
WebBrowser.maybeCompleteAuthSession();

export interface User {
    id: string | number;
    email: string;
    first_name: string;
    last_name: string;
    user_role: string;
    avatar?: string;
}

export interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    userToken: string | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (firstName: string, lastName: string, email: string, password: string, role?: string) => Promise<void>;
    signInWithGoogle: (role?: string) => Promise<void>;
    signOut: () => Promise<void>;
    restoreToken: () => Promise<void>;
    updateProfile: (data: { first_name?: string; last_name?: string; date_of_birth?: string }) => Promise<void>;
}

type AuthState = {
    isLoading: boolean;
    userToken: string | null;
    user: User | null;
};

type AuthAction =
    | { type: 'RESTORE_TOKEN'; token: string | null; user?: User }
    | { type: 'SIGN_IN'; token: string; user: User }
    | { type: 'SIGN_OUT' }
    | { type: 'SET_LOADING'; loading: boolean };

const initialState: AuthState = {
    isLoading: true,
    userToken: null,
    user: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.loading };
        case 'RESTORE_TOKEN':
            return {
                isLoading: false,
                userToken: action.token,
                user: action.user || null,
            };
        case 'SIGN_IN':
            return {
                isLoading: false,
                userToken: action.token,
                user: action.user,
            };
        case 'SIGN_OUT':
            return {
                isLoading: false,
                userToken: null,
                user: null,
            };
        default:
            return state;
    }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = CONFIG.API_URL; 
const STORAGE_KEY = 'vital_user_token';
const USER_DATA_KEY = 'vital_user_data';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);
    const isMounted = useRef(true);

    useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const safeDispatch = useCallback((action: AuthAction) => {
        if (isMounted.current) {
            dispatch(action);
        }
    }, []);

    const mapSupabaseUser = (sbUser: any): User => ({
        id: sbUser.id,
        email: sbUser.email || '',
        first_name: sbUser.user_metadata?.first_name || sbUser.user_metadata?.full_name?.split(' ')[0] || '',
        last_name: sbUser.user_metadata?.last_name || sbUser.user_metadata?.full_name?.split(' ')[1] || '',
        user_role: sbUser.user_metadata?.user_role || 'member',
        avatar: sbUser.user_metadata?.avatar_url || '',
    });

    const fetchUserProfile = async (token: string): Promise<User> => {
        const response = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        return await response.json();
    };

    const restoreToken = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                safeDispatch({ 
                    type: 'RESTORE_TOKEN', 
                    token: session.access_token, 
                    user: mapSupabaseUser(session.user) 
                });
            } else {
                const token = await AsyncStorage.getItem(STORAGE_KEY);
                if (token) {
                    try {
                        const user = await fetchUserProfile(token);
                        safeDispatch({ type: 'RESTORE_TOKEN', token, user });
                    } catch (e) {
                        await AsyncStorage.removeItem(STORAGE_KEY);
                        await AsyncStorage.removeItem(USER_DATA_KEY);
                        safeDispatch({ type: 'RESTORE_TOKEN', token: null });
                    }
                } else {
                    safeDispatch({ type: 'RESTORE_TOKEN', token: null });
                }
            }
        } catch (e) {
            console.error('Failed to restore token:', e);
            safeDispatch({ type: 'RESTORE_TOKEN', token: null });
        }
    }, [safeDispatch]);

    useEffect(() => {
        // Delay initialization to allow expo-router and navigation container to mount
        const init = async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                console.log('Supabase Auth Event:', event);
                
                if (session) {
                    safeDispatch({ 
                        type: 'SIGN_IN', 
                        token: session.access_token, 
                        user: mapSupabaseUser(session.user) 
                    });
                } else if (event === 'SIGNED_OUT') {
                    safeDispatch({ type: 'SIGN_OUT' });
                }
            });

            await restoreToken();
            return subscription;
        };

        const subPromise = init();
        return () => {
            subPromise.then(sub => sub.unsubscribe());
        };
    }, [restoreToken, safeDispatch]);

    const signInWithGoogle = useCallback(async (role: string = 'member') => {
        try {
            // If using Expo Go, this returns exp://...
            // If using a built app, this returns vitalapp://
            const redirectTo = Linking.createURL('google-auth');
            console.log('Redirect URI being sent to Supabase:', redirectTo);
            
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                    skipBrowserRedirect: true,
                    queryParams: {
                        prompt: 'select_account',
                    },
                    data: {
                        user_role: role.toLowerCase()
                    }
                },
            });

            if (error) {
                console.error('Supabase signInWithOAuth Error:', error.message);
                throw error;
            }

            if (data?.url) {
                console.log('Opening Supabase Auth URL:', data.url);
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
                console.log('WebBrowser result:', result.type);
                
                if (result.type === 'success') {
                    const { url } = result;
                    console.log('Auth success URL:', url);
                    const params = Linking.parse(url);
                    const { access_token, refresh_token } = params.queryParams as any;

                    if (access_token) {
                        const { error: sbError } = await supabase.auth.setSession({
                            access_token,
                            refresh_token,
                        });
                        if (sbError) throw sbError;
                    }
                }
            }
        } catch (e) {
            throw new Error(e instanceof Error ? e.message : 'Google login failed');
        }
    }, []);

    const signIn = useCallback(async (email: string, password: string) => {
        try {
            const response = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) {
                const { error: sbError } = await supabase.auth.signInWithPassword({ email, password });
                if (sbError) throw new Error(data.detail || sbError.message || 'Login failed');
                return;
            }

            const token = data.access_token;
            await AsyncStorage.setItem(STORAGE_KEY, token);
            const user = await fetchUserProfile(token);
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
            safeDispatch({ type: 'SIGN_IN', token, user });
        } catch (e) {
            throw new Error(e instanceof Error ? e.message : 'Login failed');
        }
    }, [safeDispatch]);

    const signUp = useCallback(
        async (firstName: string, lastName: string, email: string, password: string, role: string = 'member') => {
            try {
                const response = await fetch(`${API_URL}/api/v1/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email,
                        first_name: firstName,
                        last_name: lastName,
                        password,
                        user_role: role.toLowerCase()
                    }),
                });

                const data = await response.json();
                if (!response.ok) {
                    const { error: sbError } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: { first_name: firstName, last_name: lastName, user_role: role }
                        }
                    });
                    if (sbError) throw new Error(data.detail || sbError.message || 'Registration failed');
                    return;
                }

                const token = data.access_token;
                await AsyncStorage.setItem(STORAGE_KEY, token);
                const user = await fetchUserProfile(token);
                await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
                safeDispatch({ type: 'SIGN_IN', token, user });
            } catch (e) {
                throw new Error(e instanceof Error ? e.message : 'Registration failed');
            }
        },
        [safeDispatch]
    );

    const signOut = useCallback(async () => {
        try {
            await supabase.auth.signOut();
            const token = await AsyncStorage.getItem(STORAGE_KEY);
            if (token) {
                await fetch(`${API_URL}/api/v1/auth/logout`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                });
            }
        } catch (e) {
            console.error('Logout error:', e);
        } finally {
            await AsyncStorage.removeItem(STORAGE_KEY);
            await AsyncStorage.removeItem(USER_DATA_KEY);
            safeDispatch({ type: 'SIGN_OUT' });
        }
    }, [safeDispatch]);

    const updateProfile = useCallback(async (updateData: any) => {
        try {
            const token = await AsyncStorage.getItem(STORAGE_KEY);
            if (!token) return;

            const response = await fetch(`${API_URL}/api/v1/auth/profile`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) throw new Error('Update failed');
            
            const refreshedUser = await response.json();
            await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(refreshedUser));
            safeDispatch({ 
                type: 'SIGN_IN', 
                token, 
                user: {
                    ...refreshedUser,
                    user_role: refreshedUser.user_role // Ensure role is preserved
                } 
            });
        } catch (e) {
            console.error('Update Profile Error:', e);
            throw e;
        }
    }, [safeDispatch]);

    const authContext: AuthContextType = {
        user: state.user,
        isLoading: state.isLoading,
        userToken: state.userToken,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        restoreToken,
        updateProfile,
    };

    return (
        <AuthContext.Provider value={authContext}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
