import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { CONFIG } from '@/config';
import { useAuth } from '@/context/auth-context';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    status?: string;
    data?: any;
    plan?: boolean;
}

export default function PlannerScreen() {
    const { userToken } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'bot',
            text: "Salam! Je suis L'Architecte v3.\n\nType supportes : Workshop, Conference, Hackathon.\n\nQuel événement voulez-vous planifier ?",
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(`session_${Math.random().toString(36).substr(2, 9)}`);
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = async (overrideText?: string) => {
        const text = overrideText || inputText.trim();
        if (!text) return;

        if (!overrideText) setInputText('');

        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const response = await fetch(`${CONFIG.API_URL}/plan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    user_input: text,
                    session_id: sessionId,
                }),
            });

            const data = await response.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: data.recommendation || data.detail || JSON.stringify(data),
                timestamp: new Date(),
                status: data.status,
                data: data,
                plan: !!data.recommendation
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                sender: 'bot',
                text: "Désolé, une erreur s'est produite lors de la connexion au serveur.",
                timestamp: new Date(),
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = (text: string) => {
        sendMessage(text);
    };

    const handleSave = () => {
        sendMessage('oui');
    };

    const lastMessage = messages[messages.length - 1];
    const isPendingConfirmation = lastMessage?.status === 'pending_confirmation' || 
                                 lastMessage?.status === 'low_conf_warning' ||
                                 lastMessage?.status === 'insuf_budget_warning' ||
                                 lastMessage?.status === 'exam_risk_warning' ||
                                 lastMessage?.status === 'vacation_warning';

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isBot = item.sender === 'bot';
        return (
            <Animated.View 
                entering={FadeInUp.delay(index * 50).duration(400)}
                style={[styles.msgContainer, isBot ? styles.agentMsg : styles.userMsg]}
            >
                {isBot && (
                    <View style={styles.agentHeader}>
                        <Ionicons name="sparkles" size={16} color="#1CB0A8" />
                        <Text style={styles.agentName}>Architecte</Text>
                    </View>
                )}
                <Text style={[styles.msgText, isBot ? styles.agentText : styles.userText]}>
                    {item.text}
                </Text>
                
                {item.plan && (
                    <View style={styles.planBadge}>
                        <Ionicons name="document-text-outline" size={14} color="#10B981" />
                        <Text style={styles.planBadgeText}>Plan généré</Text>
                    </View>
                )}
            </Animated.View>
        );
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 100}
        >
            <View style={styles.header}>
                <View style={styles.statusDot} />
                <Text style={styles.headerTitle}>L'Architecte v3</Text>
                <TouchableOpacity onPress={() => setMessages([messages[0]])} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={18} color="#FF4444" />
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {loading && (
                <View style={styles.typingContainer}>
                    <ActivityIndicator size="small" color="#1CB0A8" />
                    <Text style={styles.typingText}>L'Architecte réfléchit...</Text>
                </View>
            )}

            <View style={styles.footer}>
                {!isPendingConfirmation ? (
                    <>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Posez votre question à l'Architecte..."
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                placeholderTextColor="#94A3B8"
                            />
                            <TouchableOpacity 
                                style={[styles.sendBtn, !inputText.trim() && styles.disabledBtn]} 
                                onPress={() => sendMessage()}
                                disabled={loading || !inputText.trim()}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Ionicons name="send" size={20} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <Animated.View entering={FadeIn.duration(500)} style={styles.actionColumn}>
                        <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSave}>
                            <Ionicons name="cloud-upload" size={20} color="#FFF" />
                            <Text style={styles.actionBtnText}>Confirmer & Sauvegarder</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.modifyBtn]} 
                            onPress={() => sendMessage('modifier')}
                        >
                            <Ionicons name="create-outline" size={20} color="#1CB0A8" />
                            <Text style={[styles.actionBtnText, styles.modifyBtnText]}>Modifier le plan</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => sendMessage('non')}>
                            <Ionicons name="close-circle" size={20} color="#64748B" />
                            <Text style={[styles.actionBtnText, styles.cancelBtnText]}>Annuler le plan</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        flex: 1,
    },
    clearBtn: {
        padding: 5,
    },
    listContent: {
        padding: 20,
        paddingBottom: 20,
    },
    msgContainer: {
        maxWidth: '85%',
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    agentMsg: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    userMsg: {
        alignSelf: 'flex-end',
        backgroundColor: '#1CB0A8',
    },
    agentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    agentName: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1CB0A8',
        textTransform: 'uppercase',
    },
    msgText: {
        fontSize: 15,
        lineHeight: 22,
    },
    agentText: {
        color: '#0F172A',
    },
    userText: {
        color: '#FFF',
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    planBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    typingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    typingText: {
        fontSize: 12,
        color: '#64748B',
        marginLeft: 8,
        fontStyle: 'italic',
    },
    footer: {
        backgroundColor: '#FFF',
        padding: 15,
        paddingBottom: Platform.OS === 'ios' ? 30 : 15,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    quickActions: {
        marginBottom: 15,
    },
    qBtn: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    qBtnText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    input: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 15,
        color: '#0F172A',
    },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#1CB0A8',
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledBtn: {
        backgroundColor: '#CBD5E1',
    },
    actionColumn: {
        flexDirection: 'column',
        gap: 8,
    },
    actionBtn: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 16,
        gap: 12,
    },
    saveBtn: {
        backgroundColor: '#10B981',
    },
    modifyBtn: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#1CB0A8',
    },
    cancelBtn: {
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    modifyBtnText: {
        color: '#1CB0A8',
    },
    cancelBtnText: {
        color: '#64748B',
    }
});
