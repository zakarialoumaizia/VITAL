import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export default function GoogleAuth() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user, isLoading, restoreToken } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [showManualBtn, setShowManualBtn] = useState(false);

    useEffect(() => {
        if (params.error_description) {
            setError(params.error_description as string);
            return;
        }

        // Poll for session every 1s as a backup
        const interval = setInterval(async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                await restoreToken(); // Force global state update
            }
        }, 1000);

        // Show manual override after 4s
        const timer = setTimeout(() => {
            setShowManualBtn(true);
        }, 4000);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [params]);

    useEffect(() => {
        if (user) {
            console.log('User detected in google-auth, redirecting home...');
            router.replace('/');
        }
    }, [user, router]);

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 }}>
                <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>Auth Error</Text>
                <Text style={{ color: '#64748B', marginTop: 10, textAlign: 'center' }}>{error}</Text>
                <TouchableOpacity onPress={() => router.replace('/')} style={{ marginTop: 20, padding: 12, backgroundColor: '#1CB0A8', borderRadius: 8 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
            <ActivityIndicator size="large" color="#1CB0A8" />
            <Text style={{ marginTop: 20, color: '#64748B' }}>Finalizing Authentication...</Text>
            
            {showManualBtn && (
                <TouchableOpacity 
                    onPress={() => router.replace('/')} 
                    style={{ marginTop: 30, padding: 15, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#1CB0A8' }}
                >
                    <Text style={{ color: '#1CB0A8', fontWeight: 'bold' }}>Continue to Dashboard</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}
