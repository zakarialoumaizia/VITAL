import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Animated,
    Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── Design Tokens (LIGHT MODE) ───────────────────────────────────────────────
const C = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceBorder: '#E2E8F0',
    surfaceFocus: '#F1F5F9',
    accent: '#1CB0A8',
    blue: '#4A90E2',
    blueDim: 'rgba(74, 144, 226, 0.08)',
    text: '#0F172A',
    muted: '#64748B',
    error: '#EF4444',
    errorDim: 'rgba(239, 68, 68, 0.1)',
};

export const ForgotPasswordScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [focused, setFocused] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleSend = async () => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            shake();
            return;
        }
        setLoading(true);
        setError('');
        await new Promise(r => setTimeout(r, 1500));
        setLoading(false);
        setSent(true);
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.glowTopRight} />
            <View style={s.glowBottomLeft} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                    <TouchableOpacity style={s.backBtn} onPress={onBack}>
                        <Text style={s.backIcon}>←</Text>
                    </TouchableOpacity>

                    {!sent ? (
                        <>
                            <Text style={s.headline}>RECOVER{'\n'}ACCESS.</Text>
                            <Text style={s.subline}>
                                Losing access to your metrics is not progress. Enter your email and we'll send a recovery link.
                            </Text>

                            {error ? (
                                <Animated.View style={[s.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Feather name="alert-triangle" size={14} color={C.error} />
                                    <Text style={s.errorText}>{error}</Text>
                                </View>
                                </Animated.View>
                            ) : null}

                            <Text style={s.inputLabel}>RECOVERY EMAIL</Text>
                            <View style={[s.inputWrap, focused && s.inputWrapFocused]}>
                                <TextInput
                                    style={s.input}
                                    placeholder="user@gmail.com"
                                    placeholderTextColor={C.muted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoComplete="email"
                                    editable={!loading}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                />
                            </View>

                            <TouchableOpacity
                                style={[s.cta, loading && s.ctaDisabled]}
                                onPress={handleSend}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={s.ctaText}>INITIATE RECOVERY  →</Text>
                                )}
                            </TouchableOpacity>

                            <View style={s.trustCard}>
                                <Feather name="lock" size={24} color={C.accent} style={{ marginBottom: 10 }} />
                                <Text style={s.trustTitle}>SECURE RECOVERY</Text>
                                <Text style={s.trustBody}>
                                    Your recovery is handled with institutional-grade protocols. We never store your password in plain text.
                                </Text>
                            </View>
                        </>
                    ) : (
                        <View style={s.successContainer}>
                            <View style={s.successIcon}>
                                <Feather name="mail" size={44} color={C.accent} />
                            </View>
                            <Text style={s.headline}>LINK{'\n'}SENT.</Text>
                            <Text style={s.subline}>
                                Check your inbox at {email}. The recovery link expires in 15 minutes.
                            </Text>
                            <TouchableOpacity
                                style={s.ctaSecondary}
                                onPress={onBack}
                                activeOpacity={0.85}
                            >
                                <Text style={s.ctaSecondaryText}>← BACK TO LOGIN</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 10, paddingBottom: 32 },
    glowTopRight: { position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(28, 176, 168, 0.05)' },
    glowBottomLeft: { position: 'absolute', bottom: -100, left: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(74, 144, 226, 0.05)' },
    backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.surfaceBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    backIcon: { color: C.text, fontSize: 18, fontWeight: '700' },
    headline: { fontSize: 38, fontWeight: '900', color: C.text, letterSpacing: -1.5, lineHeight: 42, marginBottom: 10 },
    subline: { fontSize: 14, color: C.muted, lineHeight: 21, marginBottom: 28 },
    errorBanner: { backgroundColor: C.errorDim, borderLeftWidth: 3, borderLeftColor: C.error, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
    errorText: { color: C.error, fontSize: 13, fontWeight: '600' },
    inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.muted, marginBottom: 9 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: C.surfaceBorder, paddingHorizontal: 18, marginBottom: 24 },
    inputWrapFocused: { borderColor: C.accent },
    input: { flex: 1, paddingVertical: 17, fontSize: 16, color: C.text, fontWeight: '500' },
    cta: { backgroundColor: C.accent, borderRadius: 20, paddingVertical: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 32, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    ctaDisabled: { opacity: 0.45 },
    ctaText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    ctaSecondary: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.surfaceBorder, marginTop: 8 },
    ctaSecondaryText: { color: C.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
    trustCard: { backgroundColor: C.blueDim, borderRadius: 22, borderWidth: 1, borderColor: C.surfaceBorder, padding: 24, alignItems: 'flex-start' },
    trustTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1, color: C.text, marginBottom: 8 },
    trustBody: { fontSize: 12, color: C.muted, lineHeight: 18 },
    successContainer: { alignItems: 'flex-start', paddingTop: 20 },
    successIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
});
