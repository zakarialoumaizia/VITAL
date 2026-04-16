import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { CONFIG } from '@/config';
import { useAuth } from '@/context/auth-context';

interface Event {
    id: string;
    event_type: string;
    topic: string;
    participants: number;
    exact_date: string;
    venue: string;
    estimated_budget: number;
    saved_at: string;
}

const EventCard = React.memo(({ item, index, onEdit }: { item: Event; index: number; onEdit: (event: Event) => void }) => {
    const getStatus = (dateStr: string) => {
        if (!dateStr) return { label: 'Inconnu', color: '#64748B', bg: '#F1F5F9' };
        
        const eventDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);

        if (eventDate.getTime() === today.getTime()) {
            return { label: 'جارية', color: '#3B82F6', bg: '#DBEAFE' };
        } else if (eventDate.getTime() < today.getTime()) {
            return { label: 'منتهية', color: '#64748B', bg: '#F1F5F9' };
        } else {
            return { label: 'قادمة', color: '#10B981', bg: '#D1FAE5' };
        }
    };

    const { label, color, bg } = getStatus(item.exact_date);
    
    return (
        <Animated.View entering={FadeInUp.delay(index * 50).duration(400)} style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>{item.event_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                    <Text style={[styles.statusText, { color: color }]}>{label}</Text>
                </View>
            </View>

            <Text style={styles.topicText}>{item.topic || 'Sans titre'}</Text>
            
            <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={styles.detailText}>{item.exact_date || 'TBD'}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="people-outline" size={14} color="#64748B" />
                    <Text style={styles.detailText}>{item.participants} p.</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="business-outline" size={14} color="#64748B" />
                    <Text style={styles.detailText} numberOfLines={1}>{item.venue || 'N/A'}</Text>
                </View>
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.idText}>ID: {item.id}</Text>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
                        <Ionicons name="create-outline" size={16} color="#0D9488" />
                        <Text style={styles.editBtnText}>Modifier</Text>
                    </TouchableOpacity>
                    <Text style={styles.budgetText}>{item.estimated_budget} TND</Text>
                </View>
            </View>
        </Animated.View>
    );
});

export default function EventsManagementScreen() {
    const { userToken } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [isModalVisible, setModalVisible] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    // Form state
    const [editForm, setEditForm] = useState<Partial<Event>>({});

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch(`${CONFIG.API_URL}/events`, {
                headers: {
                    'Authorization': `Bearer ${userToken}`,
                },
            });
            const data = await response.json();
            setEvents(data.events || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userToken]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchEvents();
    }, [fetchEvents]);

    const handleEditPress = (event: Event) => {
        setSelectedEvent(event);
        setEditForm({ ...event });
        setModalVisible(true);
    };

    const handleUpdate = async () => {
        if (!selectedEvent) return;
        setUpdateLoading(true);
        try {
            const response = await fetch(`${CONFIG.API_URL}/events/${selectedEvent.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify(editForm),
            });

            if (response.ok) {
                setModalVisible(false);
                fetchEvents();
                Alert.alert('Succès', 'L\'événement a été mis à jour.');
            } else {
                Alert.alert('Erreur', 'Impossible de mettre à jour l\'événement.');
            }
        } catch (error) {
            Alert.alert('Erreur', 'Une erreur est survenue.');
        } finally {
            setUpdateLoading(false);
        }
    };

    const renderEvent = ({ item, index }: { item: Event; index: number }) => (
        <EventCard item={item} index={index} onEdit={handleEditPress} />
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Event Management</Text>
                <Text style={styles.count}>{events.length} Plans organisés</Text>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1CB0A8" />
                </View>
            ) : (
                <FlatList
                    data={events}
                    renderItem={renderEvent}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1CB0A8']} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="calendar-clear-outline" size={48} color="#CBD5E1" />
                            <Text style={styles.emptyText}>Aucun événement planifié</Text>
                        </View>
                    }
                />
            )}

            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={styles.modalContent}
                    >
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modifier l'événement</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#0F172A" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.form}>
                            <Text style={styles.label}>Type d'événement</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.event_type}
                                onChangeText={(val) => setEditForm({ ...editForm, event_type: val })}
                                placeholder="Workshop, Conference..."
                            />

                            <Text style={styles.label}>Sujet / Topic</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.topic}
                                onChangeText={(val) => setEditForm({ ...editForm, topic: val })}
                                placeholder="Titre de l'événement"
                            />

                            <View style={styles.row}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Participants</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.participants?.toString()}
                                        onChangeText={(val) => setEditForm({ ...editForm, participants: parseInt(val) || 0 })}
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={styles.label}>Budget (TND)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={editForm.estimated_budget?.toString()}
                                        onChangeText={(val) => setEditForm({ ...editForm, estimated_budget: parseFloat(val) || 0 })}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>

                            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.exact_date}
                                onChangeText={(val) => setEditForm({ ...editForm, exact_date: val })}
                                placeholder="2026-04-20"
                            />

                            <Text style={styles.label}>Lieu / Venue</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.venue}
                                onChangeText={(val) => setEditForm({ ...editForm, venue: val })}
                                placeholder="Nom de la salle"
                            />
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.updateBtn} 
                            onPress={handleUpdate}
                            disabled={updateLoading}
                        >
                            {updateLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.updateBtnText}>Mettre à jour</Text>
                            )}
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    count: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
    },
    list: {
        padding: 15,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
    },
    topicText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
    },
    detailsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    detailText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
    },
    editBtnText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0D9488',
    },
    idText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    budgetText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#0F172A',
    },
    empty: {
        alignItems: 'center',
        marginTop: 100,
        gap: 10,
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    form: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: '#64748B',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        fontSize: 14,
        color: '#0F172A',
    },
    row: {
        flexDirection: 'row',
    },
    updateBtn: {
        backgroundColor: '#1CB0A8',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    updateBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '800',
    }
});
