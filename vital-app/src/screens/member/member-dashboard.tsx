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
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { CONFIG } from '@/config';
import Animated, { 
    FadeInUp, 
    FadeInLeft, 
    FadeInRight,
    useAnimatedStyle,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.75;

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
    bg: '#F8FAFC',
    accent: '#1CB0A8',
    text: '#0F172A',
    muted: '#64748B',
    success: '#10B981',
    white: '#FFFFFF',
    border: '#E2E8F0',
    dark: '#0F172A',
    error: '#EF4444',
    secondary: '#F1F5F9',
};

// ─── Sidebar Component ────────────────────────────────────────────────────────
const Sidebar = ({ isOpen, onClose, activeTab, setTab }: any) => {
    const { signOut } = useAuth();
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: withSpring(isOpen ? 0 : -SIDEBAR_WIDTH) }],
        opacity: withTiming(isOpen ? 1 : 0),
    }));
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: withTiming(isOpen ? 1 : 0),
        zIndex: isOpen ? 99 : -1,
    }));

    const NavItem = ({ icon, title, id, delay }: any) => (
        <Animated.View entering={FadeInLeft.delay(delay).duration(500)}>
            <TouchableOpacity 
                style={[s.sideItem, activeTab === id && s.sideItemActive]} 
                onPress={() => { setTab(id); onClose(); }}
            >
                <Feather name={icon} size={20} color={activeTab === id ? C.accent : C.muted} />
                <Text style={[s.sideLabel, activeTab === id && { color: C.accent }]}>{title}</Text>
            </TouchableOpacity>
        </Animated.View>
    );

    return (
        <>
            <Animated.View style={[s.backdrop, backdropStyle]}>
                <Pressable style={{ flex: 1 }} onPress={onClose} />
            </Animated.View>
            <Animated.View style={[s.sidebar, animatedStyle]}>
                <View style={s.sideHeader}>
                    <Text style={s.sideTitle}>VITAL MENU</Text>
                    <TouchableOpacity onPress={onClose}><Feather name="x" size={24} color={C.text} /></TouchableOpacity>
                </View>

                <View style={s.sideContent}>
                    <Text style={s.sideSection}>MAIN</Text>
                    <NavItem icon="home" title="Dashboard" id="home" delay={50} />
                    <NavItem icon="user" title="My Profile" id="profile" delay={100} />
                    
                    <Text style={[s.sideSection, { marginTop: 24 }]}>PROGRAMS</Text>
                    <NavItem icon="tool" title="Workshops" id="workshops" delay={150} />
                    <NavItem icon="mic" title="Conferences" id="conferences" delay={200} />
                    <NavItem icon="terminal" title="Hackathons" id="hackathons" delay={250} />
                </View>

                <TouchableOpacity onPress={signOut} style={s.sideLogout}>
                    <Feather name="log-out" size={20} color={C.error} />
                    <Text style={[s.sideLabel, { color: C.error }]}>Log Out</Text>
                </TouchableOpacity>
            </Animated.View>
        </>
    );
};

// ─── Page Views ───────────────────────────────────────────────────────────────

const WorkshopView = ({ data }: any) => (
    <Animated.View entering={FadeInUp} style={s.pageContainer}>
        <Text style={s.pageTitle}>VITAL WORKSHOPS</Text>
        <Text style={s.pageSub}>Learn elite skills from experts.</Text>
        {(!data || data.length === 0) ? (
            <View style={s.emptyBox}>
                <Feather name="layers" size={40} color={C.border} />
                <Text style={s.emptyText}>No workshops available at the moment.</Text>
            </View>
        ) : data.map((item: any) => (
            <View key={item.id} style={s.programCard}>
                <View style={[s.iconCircle, { backgroundColor: C.accent + '15' }]}>
                    <Feather name="layers" size={20} color={C.accent} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{item.topic || 'Untitled Workshop'}</Text>
                    <View style={s.cardMeta}>
                        <Feather name="map-pin" size={12} color={C.muted} />
                        <Text style={s.cardDesc}>{item.venue || 'TBA'}</Text>
                        <Text style={s.dot}>•</Text>
                        <Text style={s.cardDesc}>{item.month || 'Upcoming'}</Text>
                    </View>
                </View>
                <TouchableOpacity style={s.arrowBtn}>
                    <Feather name="chevron-right" size={18} color={C.accent} />
                </TouchableOpacity>
            </View>
        ))}
    </Animated.View>
);

const ConferenceView = ({ data }: any) => (
    <Animated.View entering={FadeInUp} style={s.pageContainer}>
        <Text style={s.pageTitle}>CONFERENCES</Text>
        <Text style={s.pageSub}>Elite lectures & future vision.</Text>
        {(!data || data.length === 0) ? (
             <View style={s.emptyBox}>
                <Feather name="mic" size={40} color={C.border} />
                <Text style={s.emptyText}>No conferences scheduled yet.</Text>
            </View>
        ) : data.map((item: any) => (
            <View key={item.id} style={s.lectureBox}>
                <View style={s.lectureTimeContainer}>
                    <Text style={s.lectureTime}>{item.month || 'Soon'}</Text>
                    <View style={s.timeLine} />
                </View>
                <View style={s.lectureContent}>
                    <Text style={s.lectureTitle}>{item.topic}</Text>
                    <View style={s.cardMeta}>
                        <Feather name="user" size={12} color={C.muted} />
                        <Text style={s.lectureSpeaker}>{item.venue || 'Global Arena'}</Text>
                    </View>
                </View>
            </View>
        ))}
    </Animated.View>
);

const HackathonView = ({ data }: any) => (
    <Animated.View entering={FadeInUp} style={s.pageContainer}>
        <Text style={s.pageTitle}>VITAL HACKATHONS</Text>
        <Text style={s.pageSub}>Code the next fitness revolution.</Text>
        {(!data || data.length === 0) ? (
            <View style={s.emptyBox}>
                <Feather name="terminal" size={40} color={C.border} />
                <Text style={s.emptyText}>No hackathons active right now.</Text>
            </View>
        ) : data.map((item: any) => (
            <View key={item.id} style={s.hackCard}>
                <View style={s.hackHeader}>
                    <View style={s.hackBadge}><Text style={s.hackBadgeText}>{item.month || 'OPEN'}</Text></View>
                    <Text style={s.participantsCount}>{item.participants} Participants</Text>
                </View>
                <Text style={s.hackTitle}>{item.topic}</Text>
                <Text style={s.hackDesc}>Hosted at {item.venue || 'ISSATKR'}.</Text>
                <TouchableOpacity style={s.hackBtn}>
                    <Text style={s.hackBtnText}>Register Team</Text>
                    <Feather name="arrow-right" size={16} color={C.white} />
                </TouchableOpacity>
            </View>
        ))}
    </Animated.View>
);

// ─── Member Dashboard ─────────────────────────────────────────────────────────
export const MemberDashboard = () => {
    const { user, signOut, updateProfile, userToken } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('home');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dashData, setDashData] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        date_of_birth: user?.date_of_birth || '',
    });

    const fetchData = useCallback(async () => {
        if (!userToken) return;
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/v1/member/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch dashboard');
            const data = await response.json();
            setDashData(data);
        } catch (e) {
            console.error('Error fetching member dashboard:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchData();
    }, [fetchData]);

    const handleSave = async () => {
        try {
            await updateProfile(formData);
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated!');
            fetchData(); // Refresh data
        } catch (e) {
            Alert.alert('Error', 'Update failed.');
        }
    };

    const renderContent = () => {
        if (loading && !refreshing) {
            return (
                <View style={s.loadingContainer}>
                    <ActivityIndicator size="large" color={C.accent} />
                    <Text style={s.loadingText}>Synchronizing with VITAL Core...</Text>
                </View>
            );
        }

        switch (activeTab) {
            case 'workshops': return <WorkshopView data={dashData?.programs?.workshops} />;
            case 'conferences': return <ConferenceView data={dashData?.programs?.conferences} />;
            case 'hackathons': return <HackathonView data={dashData?.programs?.hackathons} />;
            case 'profile': return (
                <View style={s.profileBox}>
                    <View style={s.avatarCircle}><Feather name="user" size={32} color={C.accent} /></View>
                    {!isEditing ? (
                        <View style={{ alignItems: 'center', width: '100%' }}>
                            <Text style={s.fullName}>{dashData?.user?.first_name || user?.first_name} {dashData?.user?.last_name || user?.last_name}</Text>
                            <Text style={s.emailText}>{dashData?.user?.email || user?.email}</Text>
                            <Text style={s.dobText}>{dashData?.user?.date_of_birth || user?.date_of_birth || 'No DOB set'}</Text>
                            <TouchableOpacity onPress={() => setIsEditing(true)} style={s.editBtn}><Text style={s.editBtnText}>Edit Profile</Text></TouchableOpacity>
                        </View>
                    ) : (
                        <View style={s.editForm}>
                            <TextInput style={s.input} value={formData.first_name} onChangeText={t => setFormData({...formData, first_name: t})} placeholder="First Name" placeholderTextColor={C.muted} />
                            <TextInput style={s.input} value={formData.last_name} onChangeText={t => setFormData({...formData, last_name: t})} placeholder="Last Name" placeholderTextColor={C.muted} />
                            <TextInput style={s.input} value={formData.date_of_birth} onChangeText={t => setFormData({...formData, date_of_birth: t})} placeholder="DOB (YYYY-MM-DD)" placeholderTextColor={C.muted} />
                            <TouchableOpacity onPress={handleSave} style={s.saveBtn}><Text style={s.saveBtnText}>Save</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setIsEditing(false)} style={s.cancelBtn}><Text style={s.cancelBtnText}>Cancel</Text></TouchableOpacity>
                        </View>
                    )}
                </View>
            );
            default: return (
                <>
                    <View style={s.welcomeRow}>
                        <Text style={s.greeting}>WELCOME BACK,</Text>
                        <Text style={s.userName}>{dashData?.user?.first_name || user?.first_name || 'Member'}</Text>
                    </View>
                    <View style={s.statsGrid}>
                        <View style={s.statBox}><Text style={s.statValue}>{dashData?.stats?.energy || '0'}</Text><Text style={s.statLabel}>Energy</Text></View>
                        <View style={s.statBox}><Text style={s.statValue}>{dashData?.stats?.activity || '0'}</Text><Text style={s.statLabel}>Activity</Text></View>
                    </View>
                    <Text style={s.sectionTitle}>FEATURED PROGRAM</Text>
                    {dashData?.featured_program ? (
                        <TouchableOpacity style={s.promoCard}>
                            <Text style={s.promoTitle}>{dashData.featured_program.topic}</Text>
                            <Text style={s.promoDesc}>Target: {dashData.featured_program.participants} participants at {dashData.featured_program.venue || 'TBA'}.</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={[s.promoCard, { backgroundColor: C.border }]}>
                            <Text style={[s.promoTitle, { color: C.muted }]}>No upcoming programs</Text>
                        </View>
                    )}
                </>
            );
        }
    };

    return (
        <SafeAreaView style={s.container}>
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} activeTab={activeTab} setTab={setActiveTab} />
            
            <View style={s.header}>
                <TouchableOpacity onPress={() => setSidebarOpen(true)} style={s.iconBtn}><Feather name="menu" size={24} color={C.text} /></TouchableOpacity>
                <Text style={s.headerLogo}>VITAL CLUB</Text>
                <TouchableOpacity onPress={signOut} style={s.iconBtn}><Feather name="log-out" size={20} color={C.error} /></TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={s.scroll}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.accent]} />
                }
            >
                {renderContent()}
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { paddingHorizontal: 24, paddingTop: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 64, paddingHorizontal: 20 },
    headerLogo: { fontSize: 16, fontWeight: '900', letterSpacing: 3, color: C.text },
    iconBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },

    // Sidebar
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sidebar: { 
        position: 'absolute', left: 0, top: 0, bottom: 0, 
        width: SIDEBAR_WIDTH, backgroundColor: C.white, zIndex: 100, 
        paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 24,
        borderTopRightRadius: 32, borderBottomRightRadius: 32,
    },
    sideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    sideTitle: { fontSize: 11, fontWeight: '900', color: C.accent, letterSpacing: 2 },
    sideContent: { flex: 1 },
    sideSection: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1 },
    sideItem: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
    sideItemActive: { backgroundColor: C.accent + '10' },
    sideLabel: { fontSize: 16, fontWeight: '700', color: C.text },
    sideLogout: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 24, borderTopWidth: 1, borderTopColor: C.border },

    // Page Universal
    pageContainer: { paddingTop: 10 },
    pageTitle: { fontSize: 24, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
    pageSub: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 24 },
    loadingText: { marginTop: 16, color: C.muted, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
    emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { color: C.muted, fontSize: 14, fontWeight: '600', textAlign: 'center' },
    cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    dot: { color: C.muted, fontSize: 12 },
    arrowBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.accent + '10', justifyContent: 'center', alignItems: 'center' },
    lectureTimeContainer: { width: 70, alignItems: 'center' },
    timeLine: { width: 2, flex: 1, backgroundColor: C.border, marginVertical: 8, borderRadius: 1 },
    participantsCount: { fontSize: 12, fontWeight: '700', color: C.success },
    
    // Workshops
    programCard: { backgroundColor: C.white, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
    iconCircle: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    cardTitle: { fontSize: 16, fontWeight: '800', color: C.text },
    cardDesc: { fontSize: 12, color: C.muted, marginTop: 2 },

    // Conferences
    lectureBox: { flexDirection: 'row', gap: 20, marginBottom: 32 },
    lectureTime: { fontSize: 12, fontWeight: '900', color: C.accent, width: 70 },
    lectureContent: { flex: 1, backgroundColor: C.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border },
    lectureTitle: { fontSize: 15, fontWeight: '800', color: C.text },
    lectureSpeaker: { fontSize: 12, color: C.muted, marginTop: 4 },

    // Hackathons
    hackCard: { backgroundColor: C.dark, borderRadius: 28, padding: 24, marginBottom: 24, shadowColor: C.dark, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
    hackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    hackBadge: { backgroundColor: C.success, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    hackBadgeText: { fontSize: 10, fontWeight: '900', color: C.white },
    hackTitle: { fontSize: 22, fontWeight: '900', color: C.white },
    hackDesc: { fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8, lineHeight: 20 },
    hackBtn: { backgroundColor: C.accent, paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 24, flexDirection: 'row', justifyContent: 'center', gap: 8 },
    hackBtnText: { color: C.white, fontWeight: '800', fontSize: 15 },

    // Other Content
    welcomeRow: { marginBottom: 24, marginTop: 10 },
    greeting: { fontSize: 11, fontWeight: '800', color: C.muted },
    userName: { fontSize: 28, fontWeight: '900', color: C.text },
    statsGrid: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    statBox: { flex: 1, backgroundColor: C.white, borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    statValue: { fontSize: 20, fontWeight: '900', color: C.text },
    statLabel: { fontSize: 12, fontWeight: '600', color: C.muted },
    sectionTitle: { fontSize: 12, fontWeight: '900', color: C.muted, letterSpacing: 1.5, marginBottom: 16 },
    promoCard: { backgroundColor: C.accent, borderRadius: 24, padding: 24 },
    promoTitle: { fontSize: 20, fontWeight: '900', color: C.white },
    promoDesc: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

    profileBox: { backgroundColor: C.white, borderRadius: 28, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border },
    avatarCircle: { width: 64, height: 64, borderRadius: 24, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    fullName: { fontSize: 22, fontWeight: '900', color: C.text },
    emailText: { fontSize: 14, color: C.muted, marginTop: 4 },
    dobText: { fontSize: 13, fontWeight: '600', color: C.muted, marginTop: 8 },
    editBtn: { marginTop: 20, backgroundColor: C.accent, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    editBtnText: { color: C.white, fontWeight: '800' },
    editForm: { width: '100%', gap: 12 },
    input: { backgroundColor: C.bg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, color: C.text },
    saveBtn: { backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: C.white, fontWeight: '800' },
    cancelBtn: { padding: 14, borderRadius: 12, alignItems: 'center', backgroundColor: C.secondary },
    cancelBtnText: { color: C.muted, fontWeight: '700' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
    loadingText: { marginTop: 16, color: C.muted, fontWeight: '700', fontSize: 13, letterSpacing: 1 },
});
