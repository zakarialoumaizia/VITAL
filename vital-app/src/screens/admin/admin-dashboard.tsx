import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Pressable,
    Platform,
    RefreshControl,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/context/theme-context';
import { CONFIG } from '@/config';
import Animated, {
    FadeInUp,
    FadeInLeft,
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import VaultScreen from '@/screens/vault-screen';
import PlannerScreen from '@/screens/admin/planner-screen';
import EventsManagementScreen from '@/screens/admin/events-management-screen';
import ProjectManagementScreen from '@/screens/admin/project-management-screen';
import DesignMasterScreen from '@/screens/admin/design-master-screen';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const getColors = (isDark: boolean) => ({
    bg: isDark ? '#0F172A' : '#F8FAFC',
    accent: '#1CB0A8',
    text: isDark ? '#F1F5F9' : '#0F172A',
    muted: isDark ? '#94A3B8' : '#64748B',
    error: '#EF4444',
    success: '#10B981',
    info: '#3B82F6',
    white: isDark ? '#1E293B' : '#FFFFFF',
    border: isDark ? '#334155' : '#E2E8F0',
});
const C_DEFAULT = getColors(false);

// AdminDashboard Component moved sub-components inside for theme support

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
export const AdminDashboard = () => {
    const { isDark, toggleTheme } = useAppTheme();
    const C = getColors(isDark);

    // ─── Sidebar Component ────────────────────────────────────────────────────────
    const Sidebar = ({ isOpen, onClose, setActiveTab }: any) => {
        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: withSpring(isOpen ? 0 : -SIDEBAR_WIDTH) }],
            opacity: withTiming(isOpen ? 1 : 0),
        }));

        const backdropStyle = useAnimatedStyle(() => ({
            opacity: withTiming(isOpen ? 1 : 0),
            zIndex: isOpen ? 99 : -1,
        }));

        const AgentItem = ({ icon, title, color, delay, onPress }: any) => (
            <Animated.View entering={FadeInLeft.delay(delay).duration(500)}>
                <TouchableOpacity style={s.sideItem} onPress={onPress}>
                    <View style={[s.sideIconBox, { backgroundColor: color + '15' }]}>
                        <Feather name={icon} size={20} color={color} />
                    </View>
                    <Text style={[s.sideLabel, { color: C.text }]}>{title}</Text>
                </TouchableOpacity>
            </Animated.View>
        );

        return (
            <>
                <Animated.View style={[s.backdrop, backdropStyle]}>
                    <Pressable style={{ flex: 1 }} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[s.sidebar, animatedStyle, { backgroundColor: C.white }]}>
                    <View style={s.sideHeader}>
                        <Text style={s.sideTitle}>VITAL AGENTS</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Feather name="x" size={24} color={C.text} />
                        </TouchableOpacity>
                    </View>

                    <View style={s.sideContent}>
                        <Text style={s.sideSection}>OPERATIONAL AGENTS</Text>
                        <AgentItem icon="mail" title="Mail Center" color={C.info} delay={100} />
                        <AgentItem
                            icon="calendar"
                            title="Event Planner"
                            color={C.accent}
                            delay={200}
                            onPress={() => { setActiveTab('planner'); onClose(); }}
                        />
                        <AgentItem
                            icon="list"
                            title="Event Management"
                            color="#F59E0B"
                            delay={250}
                            onPress={() => { setActiveTab('events'); onClose(); }}
                        />
                        <AgentItem
                            icon="briefcase"
                            title="Project Management"
                            color="#8B5CF6"
                            delay={300}
                            onPress={() => { setActiveTab('projects'); onClose(); }}
                        />
                        <AgentItem
                            icon="layers"
                            title="Design Master"
                            color="#EC4899"
                            delay={350}
                            onPress={() => { setActiveTab('design'); onClose(); }}
                        />
                        <AgentItem icon="shield" title="Sentinel Shield" color={C.error} delay={400} />

                        <Text style={[s.sideSection, { marginTop: 24 }]}>SECURITY & DATA</Text>
                        <AgentItem
                            icon="lock"
                            title="Secure Vault"
                            color="#00E5FF"
                            delay={500}
                            onPress={() => { setActiveTab('vault'); onClose(); }}
                        />
                    </View>
                </Animated.View>
            </>
        );
    };

    // ─── Main Content Sub-components ──────────────────────────────────────────────
    const StatCard = ({ label, value, trend, delay }: any) => (
        <Animated.View entering={FadeInUp.delay(delay).duration(600)} style={[s.statCardFull, { backgroundColor: C.white, borderColor: C.border }]}>
            <View>
                <Text style={[s.statLabelFull, { color: C.muted }]}>{label}</Text>
                <Text style={[s.statValueFull, { color: C.text }]}>{value}</Text>
            </View>
            <View style={s.statTrend}>
                <Feather name="trending-up" size={14} color={C.success} />
                <Text style={s.statTrendText}>{trend}</Text>
            </View>
        </Animated.View>
    );

    const MessageItem = ({ name, msg, time }: any) => (
        <View style={[s.msgItem, { borderBottomColor: C.border }]}>
            <View style={[s.msgAvatar, { backgroundColor: C.border }]} />
            <View style={{ flex: 1 }}>
                <View style={s.msgHeader}>
                    <Text style={[s.msgName, { color: C.text }]}>{name}</Text>
                    <Text style={s.msgTime}>{time}</Text>
                </View>
                <Text style={[s.msgText, { color: C.muted }]} numberOfLines={1}>{msg}</Text>
            </View>
        </View>
    );

    // ─── Dynamic Styles ──────────────────────────────────────────────────────────
    const s = React.useMemo(() => StyleSheet.create({
        container: { flex: 1 },
        scroll: { paddingHorizontal: 20, paddingTop: 10 },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 64, paddingHorizontal: 20 },
        headerTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, color: C.text },
        menuBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center' },
        profileBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },

        // Sidebar
        backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
        sidebar: {
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: SIDEBAR_WIDTH, backgroundColor: C.white, zIndex: 100,
            paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 24,
            borderTopRightRadius: 30, borderBottomRightRadius: 30,
            shadowColor: '#000', shadowOffset: { width: 10, height: 0 }, shadowOpacity: 0.1, shadowRadius: 20,
        },
        sideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
        sideTitle: { fontSize: 12, fontWeight: '900', color: C.accent, letterSpacing: 1.5 },
        sideContent: { flex: 1 },
        sideSection: { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: 20 },
        sideItem: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
        sideIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
        sideLabel: { fontSize: 15, fontWeight: '700', color: C.text },
        sideFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 24, borderTopWidth: 1, borderTopColor: C.border },
        sideFooterLabel: { fontSize: 14, fontWeight: '600', color: C.muted },

        welcomeBox: { marginBottom: 24 },
        welcomeText: { fontSize: 13, fontWeight: '600', color: C.muted },
        sectionLabel: { fontSize: 11, fontWeight: '900', color: C.muted, letterSpacing: 1, marginBottom: 16 },
        sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        seeAll: { fontSize: 12, fontWeight: '800', color: C.accent },

        statsContainer: { gap: 12, marginBottom: 32 },
        statCardFull: { backgroundColor: C.white, borderRadius: 24, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: C.border },
        statLabelFull: { fontSize: 12, fontWeight: '600', color: C.muted },
        statValueFull: { fontSize: 24, fontWeight: '900', color: C.text, marginTop: 4 },
        statTrend: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.success + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        statTrendText: { fontSize: 11, fontWeight: '900', color: C.success },

        chartBox: { backgroundColor: C.white, borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: C.border },
        chartPlaceholder: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', gap: 8 },
        bar: { flex: 1, width: 20, backgroundColor: C.border, borderRadius: 4 },
        chartLabels: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
        chartLabel: { fontSize: 10, fontWeight: '700', color: C.muted },

        messagesBox: { backgroundColor: C.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: C.border },
        msgItem: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
        msgAvatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.bg },
        msgHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
        msgName: { fontSize: 14, fontWeight: '800', color: C.text },
        msgTime: { fontSize: 10, fontWeight: '600', color: C.muted },
        msgText: { fontSize: 13, color: C.muted },
        loadingText: { textAlign: 'center', color: C.muted, paddingVertical: 20 },

        backBtn: {
            position: 'absolute',
            top: 20,
            left: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
        }
    }), [C]);

    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { signOut, userToken } = useAuth();

    const fetchStats = useCallback(async () => {
        if (!userToken) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/v1/admin/stats`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            const data = await response.json();
            setStats(data);
        } catch (e) {
            console.error('Error fetching admin stats:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, [fetchStats]);

    const renderMainContent = () => (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scroll}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} />
            }
        >
            <View style={s.welcomeBox}>
                <Text style={s.welcomeText}>System Status: <Text style={{ color: C.success }}>Active</Text></Text>
            </View>

            <Text style={s.sectionLabel}>OVERVIEW STATISTICS</Text>
            <View style={s.statsContainer}>
                <StatCard
                    label="Total Active Members"
                    value={loading ? '...' : (stats?.total_members || '0')}
                    trend={stats?.growth || '+0%'}
                    delay={100}
                />
                <StatCard
                    label="Verified Partners"
                    value={loading ? '...' : (stats?.total_partners || '0')}
                    trend="+5.3%"
                    delay={200}
                />
            </View>

            <Text style={s.sectionLabel}>ACTIVITY CHART</Text>
            <View style={s.chartBox}>
                <View style={s.chartPlaceholder}>
                    {(stats?.activity_chart || [{}, {}, {}, {}, {}, {}]).map((item: any, i: number) => (
                        <View
                            key={`bar-${i}`}
                            style={[
                                s.bar,
                                {
                                    height: loading ? '20%' : `${(item.count || 10) * 3}%`,
                                    backgroundColor: i % 2 === 0 ? C.border : C.accent
                                }
                            ]}
                        />
                    ))}
                </View>
                <View style={s.chartLabels}>
                    {['M', 'T', 'W', 'T', 'F', 'S'].map((l, i) => (
                        <Text key={`label-${l}-${i}`} style={s.chartLabel}>{l}</Text>
                    ))}
                </View>
            </View>

            <View style={s.sectionRow}>
                <Text style={s.sectionLabel}>RECENT MESSAGES</Text>
                <TouchableOpacity><Text style={s.seeAll}>Open Mail</Text></TouchableOpacity>
            </View>
            <View style={s.messagesBox}>
                {loading ? (
                    <Text style={s.loadingText}>Connecting to system...</Text>
                ) : (
                    (stats?.recent_messages || []).map((m: any) => (
                        <MessageItem key={`msg-${m.id}`} name={m.name} msg={m.msg} time={m.time} />
                    ))
                )}
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );

    return (
        <SafeAreaView style={[s.container, { backgroundColor: C.bg }]}>
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                setActiveTab={setActiveTab}
            />

            <View style={s.header}>
                <TouchableOpacity onPress={() => setSidebarOpen(true)} style={s.menuBtn}>
                    <Feather name="menu" size={24} color={C.text} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TouchableOpacity onPress={toggleTheme} style={s.menuBtn}>
                        <Feather name={isDark ? "sun" : "moon"} size={20} color={C.text} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>
                        {activeTab === 'vault' ? 'SECURE VAULT' :
                            activeTab === 'planner' ? "EVENT ARCHITECT" :
                                activeTab === 'events' ? "EVENT MANAGEMENT" :
                                    activeTab === 'projects' ? "PROJECT MANAGEMENT" :
                                        activeTab === 'design' ? "DESIGN MASTER" :
                                            'DASHBOARD'}
                    </Text>
                </View>
                <TouchableOpacity onPress={signOut} style={s.profileBtn}>
                    <Feather name="log-out" size={18} color={C.error} />
                </TouchableOpacity>
            </View>

            {activeTab === 'vault' ? (
                <View style={{ flex: 1 }}>
                    <VaultScreen />
                </View>
            ) : activeTab === 'planner' ? (
                <View style={{ flex: 1 }}>
                    <PlannerScreen />
                </View>
            ) : activeTab === 'events' ? (
                <View style={{ flex: 1 }}>
                    <EventsManagementScreen onEdit={(eventId) => setActiveTab('planner')} />
                </View>
            ) : activeTab === 'projects' ? (
                <View style={{ flex: 1 }}>
                    <ProjectManagementScreen />
                </View>
            ) : activeTab === 'design' ? (
                <View style={{ flex: 1 }}>
                    <DesignMasterScreen />
                </View>
            ) : (
                renderMainContent()
            )}
        </SafeAreaView>
    );
};


