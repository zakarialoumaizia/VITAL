import React, { useState, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    TextInput,
    Alert,
    Pressable,
    Platform,
    ActivityIndicator,
    RefreshControl,
    KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CONFIG } from '@/config';
import Animated, { 
    FadeInUp, 
    FadeInLeft, 
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

const C = {
    bg: '#F8FAFC',
    accent: '#1CB0A8',
    text: '#0F172A',
    muted: '#64748B',
    card: '#FFFFFF',
    white: '#FFFFFF',
    border: '#E2E8F0',
    error: '#EF4444',
    secondary: '#F1F5F9',
};

export const SponsorDashboard = () => {
    const { user, signOut, userToken } = useAuth();
    const [activeTab, setActiveTab] = useState('home');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashData, setDashData] = useState<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Messaging state
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    const fetchData = useCallback(async () => {
        if (!userToken) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/v1/sponsor/dashboard`, {
                headers: { 'Authorization': `Bearer ${userToken}` },
            });
            const data = await response.json();
            setDashData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSendMessage = async () => {
        if (!subject || !content) {
            Alert.alert('Missing fields', 'Please provide a subject and a message.');
            return;
        }
        setSending(true);
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/v1/sponsor/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({ subject, content }),
            });
            if (response.ok) {
                Alert.alert('Message Sent', 'Your message has been delivered to VITAL Club administration.');
                setSubject('');
                setContent('');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to send message.');
        } finally {
            setSending(false);
        }
    };

    const renderContent = () => {
        if (loading) return <ActivityIndicator color={C.accent} style={{ marginTop: 100 }} />;

        if (activeTab === 'message') {
            return (
                <KeyboardAvoidingView behavior="padding" style={s.pageContainer}>
                    <Text style={s.pageTitle}>CONTACT CLUB</Text>
                    <Text style={s.pageSub}>Direct line to VITAL Administration.</Text>
                    <View style={s.msgForm}>
                        <TextInput 
                            style={s.input} 
                            placeholder="Subject" 
                            placeholderTextColor={C.muted} 
                            value={subject}
                            onChangeText={setSubject}
                        />
                        <TextInput 
                            style={[s.input, s.textArea]} 
                            placeholder="Your message content..." 
                            placeholderTextColor={C.muted} 
                            multiline 
                            numberOfLines={6}
                            value={content}
                            onChangeText={setContent}
                        />
                        <TouchableOpacity style={s.sendBtn} onPress={handleSendMessage} disabled={sending}>
                            {sending ? <ActivityIndicator color={C.bg} /> : (
                                <>
                                    <Text style={s.sendBtnText}>Send Message</Text>
                                    <Feather name="send" size={18} color={C.bg} />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            );
        }

        return (
            <>
                <View style={s.welcomeRow}>
                    <Text style={s.greeting}>SPONSOR OVERVIEW</Text>
                    <Text style={s.userName}>{dashData?.user?.name || 'Partner'}</Text>
                </View>

                <View style={s.statsGrid}>
                    <View style={s.statBox}>
                        <Text style={s.statValue}>{dashData?.stats?.total_events || '0'}</Text>
                        <Text style={s.statLabel}>Total Events</Text>
                    </View>
                    <View style={s.statBox}>
                        <Text style={s.statValue}>{dashData?.stats?.visibility_index || '0%'}</Text>
                        <Text style={s.statLabel}>Visibility</Text>
                    </View>
                </View>

                <Text style={s.sectionTitle}>CLUB ACTIVITY (REAL-TIME)</Text>
                {dashData?.activity?.map((item: any) => (
                    <View key={item.id} style={s.activityCard}>
                        <View style={s.activityIcon}>
                            <Feather name="activity" size={20} color={C.accent} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.activityTitle}>{item.title}</Text>
                            <Text style={s.activityMeta}>{item.type} • {item.date}</Text>
                            <Text style={s.activityImpact}>{item.impact}</Text>
                        </View>
                    </View>
                ))}
            </>
        );
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <View>
                    <Text style={s.headerSubtitle}>VITAL CLUB</Text>
                    <Text style={s.headerTitle}>SPONSOR PORTAL</Text>
                </View>
                <TouchableOpacity onPress={signOut} style={s.logoutBtn}>
                    <Feather name="log-out" size={20} color={C.error} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchData} tintColor={C.accent} />}
            >
                {renderContent()}
                <View style={{ height: 100 }} />
            </ScrollView>

            <View style={s.bottomTabs}>
                <TouchableOpacity style={[s.tab, activeTab === 'home' && s.tabActive]} onPress={() => setActiveTab('home')}>
                    <Feather name="home" size={20} color={activeTab === 'home' ? C.white : C.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={[s.tab, activeTab === 'message' && s.tabActive]} onPress={() => setActiveTab('message')}>
                    <Feather name="mail" size={20} color={activeTab === 'message' ? C.white : C.accent} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    headerSubtitle: { color: C.accent, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    headerTitle: { color: C.text, fontSize: 20, fontWeight: '900' },
    logoutBtn: { padding: 10 },
    scroll: { paddingHorizontal: 24 },
    welcomeRow: { marginBottom: 32 },
    greeting: { fontSize: 12, fontWeight: '800', color: C.muted, letterSpacing: 1 },
    userName: { fontSize: 32, fontWeight: '900', color: C.text, marginTop: 4 },
    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statBox: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.border },
    statValue: { fontSize: 24, fontWeight: '900', color: C.accent },
    statLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
    sectionTitle: { fontSize: 12, fontWeight: '900', color: C.accent, letterSpacing: 1.5, marginBottom: 16 },
    activityCard: { backgroundColor: C.card, borderRadius: 20, padding: 16, flexDirection: 'row', gap: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border },
    activityIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
    activityTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    activityMeta: { fontSize: 12, color: C.muted, marginTop: 2 },
    activityImpact: { fontSize: 12, color: C.accent, fontWeight: '700', marginTop: 4 },
    bottomTabs: { position: 'absolute', bottom: 30, left: 40, right: 40, height: 64, backgroundColor: C.card, borderRadius: 32, flexDirection: 'row', padding: 8, gap: 8, borderWidth: 1, borderColor: C.border },
    tab: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 24 },
    tabActive: { backgroundColor: C.accent },
    // Form
    pageContainer: { paddingTop: 10 },
    pageTitle: { fontSize: 24, fontWeight: '900', color: C.text },
    pageSub: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 24 },
    msgForm: { gap: 16 },
    input: { backgroundColor: C.card, padding: 16, borderRadius: 16, color: C.text, borderWidth: 1, borderColor: C.border },
    textArea: { height: 150, textAlignVertical: 'top' },
    sendBtn: { backgroundColor: C.accent, paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
    sendBtnText: { color: C.white, fontWeight: '900', fontSize: 16 },
});
