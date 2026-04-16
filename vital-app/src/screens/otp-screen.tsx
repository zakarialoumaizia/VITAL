import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── Design Tokens (LIGHT MODE) ───────────────────────────────────────────────
const C = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceBorder: '#E2E8F0',
    accent: '#1CB0A8',
    accentDim: 'rgba(28, 176, 168, 0.05)',
    text: '#0F172A',
    muted: '#64748B',
    error: '#EF4444',
};

export const OTPScreen: React.FC<{
    email?: string;
    onVerified: () => void;
    onBack: () => void;
}> = ({ email = 'your email', onVerified, onBack }) => {
    const [code, setCode] = useState(['', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verified, setVerified] = useState(false);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleChange = (val: string, idx: number) => {
        const nums = val.replace(/[^0-9]/g, '');
        const next = [...code];
        next[idx] = nums.slice(-1);
        setCode(next);
        if (nums && idx < 3) {
            inputRefs.current[idx + 1]?.focus();
        }
    };

    const handleKeyPress = (key: string, idx: number) => {
        if (key === 'Backspace' && !code[idx] && idx > 0) {
            inputRefs.current[idx - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        if (code.some(c => !c)) {
            setError('Please enter all 4 digits');
            return;
        }
        setLoading(true);
        setError('');
        await new Promise(r => setTimeout(r, 1500));
        setLoading(false);
        setVerified(true);
        setTimeout(() => onVerified(), 1200);
    };

    const isComplete = code.every(c => c !== '');

    return (
        <SafeAreaView style={s.container}>
            <View style={s.glowTopRight} />
            <View style={s.glowBottomLeft} />

            <View style={s.content}>
                <TouchableOpacity style={s.backBtn} onPress={onBack}>
                    <Text style={s.backIcon}>←</Text>
                </TouchableOpacity>

                {!verified ? (
                    <>
                        <Text style={s.headline}>UPLINK{'\n'}CODE.</Text>
                        <Text style={s.subline}>
                            Enter the 4-digit code sent to{'\n'}
                            <Text style={{ color: C.accent, fontWeight: '700' }}>{email}</Text>
                        </Text>

                        {error ? (
                            <View style={[s.errorBanner, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                                <Feather name="alert-triangle" size={14} color={C.error} />
                                <Text style={s.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        <View style={s.otpRow}>
                            {code.map((digit, i) => (
                                <TextInput
                                    key={i}
                                    ref={el => { inputRefs.current[i] = el; }}
                                    style={[s.otpInput, digit && s.otpInputFilled]}
                                    value={digit}
                                    onChangeText={val => handleChange(val, i)}
                                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    autoFocus={i === 0}
                                    selectTextOnFocus
                                />
                            ))}
                        </View>

                        <TouchableOpacity>
                            <Text style={s.resendText}>
                                Didn't receive it?{' '}
                                <Text style={s.resendLink}>Resend code</Text>
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.cta, (!isComplete || loading) && s.ctaDisabled]}
                            onPress={handleVerify}
                            disabled={!isComplete || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={s.ctaText}>SYNC PROFILE  →</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={s.verifiedContainer}>
                        <View style={s.verifiedIcon}>
                            <Feather name="check-circle" size={48} color={C.accent} />
                        </View>
                        <Text style={s.headline}>ACCESS{'\n'}GRANTED.</Text>
                        <Text style={s.subline}>
                            Identity verified. Loading your VITAL dashboard…
                        </Text>
                        <ActivityIndicator color={C.accent} size="large" style={{ marginTop: 24 }} />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
    glowTopRight: { position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(28, 176, 168, 0.05)' },
    glowBottomLeft: { position: 'absolute', bottom: -100, left: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(74, 144, 226, 0.05)' },
    backBtn: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.surfaceBorder, justifyContent: 'center', alignItems: 'center', marginBottom: 36, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    backIcon: { color: C.text, fontSize: 18, fontWeight: '700' },
    headline: { fontSize: 38, fontWeight: '900', color: C.text, letterSpacing: -1.5, lineHeight: 42, marginBottom: 10 },
    subline: { fontSize: 14, color: C.muted, lineHeight: 22, marginBottom: 36 },
    errorBanner: { backgroundColor: 'rgba(239,68,68,0.05)', borderLeftWidth: 3, borderLeftColor: C.error, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
    errorText: { color: C.error, fontSize: 13, fontWeight: '600' },
    otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 28 },
    otpInput: { width: 72, height: 80, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: C.surfaceBorder, textAlign: 'center', fontSize: 28, fontWeight: '900', color: C.text, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
    otpInputFilled: { borderColor: C.accent, backgroundColor: C.surface, color: C.accent },
    resendText: { textAlign: 'center', fontSize: 13, color: C.muted, marginBottom: 36 },
    resendLink: { color: C.accent, fontWeight: '700', textDecorationLine: 'underline' },
    cta: { backgroundColor: C.accent, borderRadius: 20, paddingVertical: 19, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    ctaDisabled: { opacity: 0.4 },
    ctaText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    verifiedContainer: { flex: 1, justifyContent: 'center' },
    verifiedIcon: { width: 100, height: 100, borderRadius: 30, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
});
