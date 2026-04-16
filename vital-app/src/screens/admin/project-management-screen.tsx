import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Project {
    id: string;
    name: string;
    client: string;
    progress: number;
    status: 'In Progress' | 'Completed' | 'On Hold';
    team: string[];
    dueDate: string;
}

const MOCK_PROJECTS: Project[] = [
    {
        id: 'P-001',
        name: 'VITAL Mobile App Redesign',
        client: 'Internal',
        progress: 75,
        status: 'In Progress',
        team: ['ZL', 'AM', 'KB'],
        dueDate: '2026-05-15',
    },
    {
        id: 'P-002',
        name: 'Supabase Migration',
        client: 'Global Tech',
        progress: 100,
        status: 'Completed',
        team: ['ZL', 'SY'],
        dueDate: '2026-04-10',
    },
    {
        id: 'P-003',
        name: 'AI Event Planner Integration',
        client: 'Events Co.',
        progress: 45,
        status: 'In Progress',
        team: ['AM', 'JD'],
        dueDate: '2026-06-01',
    },
    {
        id: 'P-004',
        name: 'Security Audit v3',
        client: 'CyberShield',
        progress: 10,
        status: 'On Hold',
        team: ['KB'],
        dueDate: '2026-07-20',
    }
];

export default function ProjectManagementScreen() {
    const renderProject = ({ item, index }: { item: Project; index: number }) => {
        const getStatusColor = (status: string) => {
            switch(status) {
                case 'Completed': return '#10B981';
                case 'On Hold': return '#F59E0B';
                default: return '#3B82F6';
            }
        };

        return (
            <Animated.View entering={FadeInDown.delay(index * 100).duration(500)} style={styles.card}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.client}>{item.client}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                    </View>
                </View>

                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={styles.progressValue}>{item.progress}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${item.progress}%`, backgroundColor: getStatusColor(item.status) }]} />
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.team}>
                        {item.team.map((member, i) => (
                            <View key={i} style={[styles.avatar, { marginLeft: i === 0 ? 0 : -10 }]}>
                                <Text style={styles.avatarText}>{member}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.dateInfo}>
                        <Ionicons name="time-outline" size={14} color="#64748B" />
                        <Text style={styles.dateText}>{item.dueDate}</Text>
                    </View>
                </View>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Project Management</Text>
                <Text style={styles.subtitle}>Track and manage your current virtual projects</Text>
            </View>

            <FlatList
                data={MOCK_PROJECTS}
                renderItem={renderProject}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: {
        fontSize: 22,
        fontWeight: '900',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    list: {
        padding: 15,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    name: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        maxWidth: '80%',
    },
    client: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
    },
    progressSection: {
        marginBottom: 20,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    progressValue: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0F172A',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    team: {
        flexDirection: 'row',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1CB0A8',
        borderWidth: 2,
        borderColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    dateInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    }
});
