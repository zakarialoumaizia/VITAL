import React, { useState, useRef } from 'react';
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
    ScrollView,
    Share,
    Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { CONFIG } from '@/config';
import { useAuth } from '@/context/auth-context';

interface Message {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    data?: any;
    type?: 'result' | 'greeting' | 'unclear';
}

export default function DesignMasterScreen() {
    const { userToken } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            sender: 'bot',
            text: "Salam ! Je suis La Liaison, votre expert RP & Design.\n\nDécrivez votre événement (ex: Workshop UI/UX, Hackathon Tech) et je générerai :\n📸 Légendes Instagram\n📧 Emails de sponsoring\n🎨 Palettes de couleurs",
            timestamp: new Date(),
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const sendMessage = async () => {
        const text = inputText.trim();
        if (!text) return;

        setInputText('');
        const userMsg: Message = {
            id: Date.now().toString(),
            sender: 'user',
            text,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const response = await fetch(`${CONFIG.API_URL}/design-master/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    description: text,
                    event_type: "workshop", // Fallback or extracted from text later
                }),
            });

            const data = await response.json();

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: data.reply || "Voici ce que j'ai préparé pour vous :",
                timestamp: new Date(),
                data: data,
                type: data.type
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

    const copyToClipboard = (content: string) => {
        Clipboard.setString(content);
        // Could add a toast here
    };

    const renderPalette = (palette: any) => {
        if (!palette || !palette.colors) return null;
        return (
            <View style={styles.paletteContainer}>
                <Text style={styles.paletteTitle}>{palette.palette_name}</Text>
                <Text style={styles.paletteSub}>{palette.inspiration}</Text>
                <View style={styles.colorsGrid}>
                    {palette.colors.map((c: any, i: number) => (
                        <View key={i} style={styles.colorItem}>
                            <View style={[styles.colorBox, { backgroundColor: c.hex }]} />
                            <Text style={styles.colorHex}>{c.hex}</Text>
                            <Text style={styles.colorRole}>{c.role}</Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isBot = item.sender === 'bot';
        const isResult = item.type === 'result';

        return (
            <Animated.View 
                entering={FadeInUp.delay(index * 50).duration(400)}
                style={[styles.msgContainer, isBot ? styles.agentMsg : styles.userMsg]}
            >
                {isBot && (
                    <View style={styles.agentHeader}>
                        <Ionicons name="color-palette" size={16} color="#EC4899" />
                        <Text style={styles.agentName}>Design Master</Text>
                    </View>
                )}
                
                <Text style={[styles.msgText, isBot ? styles.agentText : styles.userText]}>
                    {item.text}
                </Text>

                {isResult && item.data && (
                    <View style={styles.resultBox}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>📸 INSTAGRAM</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(item.data.instagram_caption)}>
                                    <Ionicons name="copy-outline" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.sectionText}>{item.data.instagram_caption}</Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>📧 SPONSORING</Text>
                                <TouchableOpacity onPress={() => copyToClipboard(item.data.sponsoring_email)}>
                                    <Ionicons name="copy-outline" size={18} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.sectionText}>{item.data.sponsoring_email}</Text>
                        </View>

                        {renderPalette(item.data.color_palette)}
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
                <View style={[styles.statusDot, { backgroundColor: '#EC4899' }]} />
                <Text style={styles.headerTitle}>La Liaison v1</Text>
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
                    <ActivityIndicator size="small" color="#EC4899" />
                    <Text style={styles.typingText}>Création en cours...</Text>
                </View>
            )}

            <View style={styles.footer}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Décrivez votre événement..."
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity 
                        style={[styles.sendBtn, !inputText.trim() && styles.disabledBtn]} 
                        onPress={sendMessage}
                        disabled={loading || !inputText.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <Ionicons name="send" size={20} color="#FFF" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 },
    clearBtn: { padding: 5 },
    listContent: { padding: 20 },
    msgContainer: { maxWidth: '90%', padding: 16, borderRadius: 20, marginBottom: 16 },
    agentMsg: { alignSelf: 'flex-start', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
    userMsg: { alignSelf: 'flex-end', backgroundColor: '#EC4899' },
    agentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    agentName: { fontSize: 12, fontWeight: '800', color: '#EC4899', textTransform: 'uppercase' },
    msgText: { fontSize: 15, lineHeight: 22 },
    agentText: { color: '#0F172A' },
    userText: { color: '#FFF' },
    typingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    typingText: { fontSize: 12, color: '#64748B', marginLeft: 8, fontStyle: 'italic' },
    footer: { backgroundColor: '#FFF', padding: 15, paddingBottom: Platform.OS === 'ios' ? 30 : 15, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 15, color: '#0F172A' },
    sendBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center' },
    disabledBtn: { backgroundColor: '#CBD5E1' },
    resultBox: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 15 },
    section: { marginBottom: 20, backgroundColor: '#F1F5F9', padding: 12, borderRadius: 12 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: '#64748B' },
    sectionText: { fontSize: 14, color: '#334155', lineHeight: 20 },
    paletteContainer: { marginTop: 10, backgroundColor: '#0F172A', padding: 16, borderRadius: 16 },
    paletteTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    paletteSub: { color: '#94A3B8', fontSize: 12, marginBottom: 15 },
    colorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorItem: { alignItems: 'center', width: '30%' },
    colorBox: { width: '100%', height: 40, borderRadius: 8, marginBottom: 4 },
    colorHex: { color: '#FFF', fontSize: 9, fontWeight: '700' },
    colorRole: { color: '#64748B', fontSize: 8, textTransform: 'uppercase' },
});
