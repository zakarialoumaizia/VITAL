import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/context/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export const PartnerDashboard = () => {
    const { user, signOut } = useAuth();
    
    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.greeting}>Hello, Partner</Text>
                    <Text style={s.name}>{user?.first_name} {user?.last_name}</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={s.logoutBtn}>
                    <Feather name="log-out" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
            
            <View style={s.content}>
                <View style={s.card}>
                    <Feather name="briefcase" size={32} color="#1CB0A8" />
                    <Text style={s.cardTitle}>Partner Hub</Text>
                    <Text style={s.cardDesc}>Manage your programs and professional content.</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingBottom: 10 },
    greeting: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    name: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
    logoutBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' },
    cardTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 16 },
    cardDesc: { fontSize: 14, color: '#64748B', marginTop: 4, lineHeight: 20 },
});
