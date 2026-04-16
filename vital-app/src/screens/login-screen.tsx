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
    Dimensions,
    Text,
} from 'react-native';
import { useAuth } from '@/context/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── Design Tokens (LIGHT MODE) ───────────────────────────────────────────────
const C = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceBorder: '#E2E8F0',
    surfaceFocus: '#F1F5F9',
    accent: '#1CB0A8',
    accentDim: 'rgba(28, 176, 168, 0.1)',
    blue: '#4A90E2',
    blueDim: 'rgba(74, 144, 226, 0.1)',
    text: '#0F172A',
    muted: '#64748B',
    error: '#EF4444',
    errorDim: 'rgba(239, 68, 68, 0.1',
};

const { width } = Dimensions.get('window');

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InputFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    editable?: boolean;
    rightElement?: React.ReactNode;
    autoComplete?: any;
}

const InputField: React.FC<InputFieldProps> = ({
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    editable = true,
    rightElement,
    autoComplete,
}) => {
    const [focused, setFocused] = useState(false);
    return (
        <View style={s.inputGroup}>
            <Text style={s.inputLabel}>{label}</Text>
            <View style={[s.inputWrap, focused && s.inputWrapFocused]}>
                <TextInput
                    style={s.input}
                    placeholder={placeholder}
                    placeholderTextColor={C.muted}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    editable={editable}
                    autoComplete={autoComplete}
                    autoCapitalize="none"
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                />
                {rightElement}
            </View>
        </View>
    );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────

export const LoginScreen: React.FC<{
    onNavigateToRegister: () => void;
    onNavigateToForgotPassword?: () => void;
}> = ({ onNavigateToRegister, onNavigateToForgotPassword }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, signInWithGoogle } = useAuth();

    const shakeAnim = useRef(new Animated.Value(0)).current;
    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please fill in all fields');
            shake();
            return;
        }
        try {
            setLoading(true);
            setError('');
            await signIn(email, password);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
            shake();
        } finally {
            setLoading(false);
        }
    };



    const handleSocialLogin = async (provider: string) => {
        if (provider === 'Google') {
            try {
                setLoading(true);
                await signInWithGoogle();
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Google sign-in failed');
                shake();
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.glowTopRight} />
            <View style={s.glowBottomLeft} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={s.scroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={s.header}>
                        <View style={s.logoBox}>
                            <Feather name="zap" style={s.logoZap} />
                        </View>
                        <Text style={s.headline}>WELCOME{'\n'}BACK.</Text>
                        <Text style={s.subline}>
                            Reconnect with your VITAL Club dashboard.
                        </Text>
                    </View>

                    {error ? (
                        <Animated.View
                            style={[s.errorBanner, { transform: [{ translateX: shakeAnim }] }]}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="alert-triangle" size={14} color={C.error} />
                                <Text style={s.errorText}>{error}</Text>
                            </View>
                        </Animated.View>
                    ) : null}

                    <View style={s.form}>
                        <InputField
                            label="EMAIL OR PHONE"
                            placeholder="user@gmail.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            editable={!loading}
                            autoComplete="email"
                        />

                        <InputField
                            label="PASSWORD"
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            editable={!loading}
                            rightElement={
                                <TouchableOpacity
                                    onPress={() => setShowPassword(v => !v)}
                                    style={s.eyeBtn}
                                    disabled={loading}
                                >
                                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={C.muted} />
                                </TouchableOpacity>
                            }
                        />

                        <TouchableOpacity
                            onPress={onNavigateToForgotPassword}
                            style={s.forgotRow}
                            disabled={loading}
                        >
                            <Text style={s.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[s.cta, loading && s.ctaDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={s.ctaText}>SIGN IN  →</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={s.dividerRow}>
                        <View style={s.dividerLine} />
                        <Text style={s.dividerLabel}>OR</Text>
                        <View style={s.dividerLine} />
                    </View>

                    <View style={s.socialRow}>
                        <TouchableOpacity
                            style={s.socialBtn}
                            onPress={() => handleSocialLogin('Google')}
                            disabled={loading}
                            activeOpacity={0.7}
                        >
                            <Text style={s.socialIconG}>G</Text>
                            <Text style={s.socialLabel}>Continue with Google</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={s.footer}>
                        <Text style={s.footerText}>Not have account? </Text>
                        <TouchableOpacity
                            onPress={onNavigateToRegister}
                            disabled={loading}
                        >
                            <Text style={s.footerLink}>Join Today</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
    },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 32,
    },
    glowTopRight: {
        position: 'absolute',
        top: -80,
        right: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(28, 176, 168, 0.05)',
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: -100,
        left: -100,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(74, 144, 226, 0.05)',
    },
    header: {
        marginTop: 12,
        marginBottom: 32,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 28,
        transform: [{ rotate: '-5deg' }],
    },
    logoZap: {
        fontSize: 32,
        color: C.accent,
    },
    headline: {
        fontSize: 40,
        fontWeight: '900',
        color: C.text,
        letterSpacing: -1.5,
        lineHeight: 44,
        marginBottom: 10,
    },
    subline: {
        fontSize: 15,
        color: C.muted,
        lineHeight: 22,
    },
    errorBanner: {
        backgroundColor: C.errorDim,
        borderLeftWidth: 3,
        borderLeftColor: C.error,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 20,
    },
    errorText: {
        color: C.error,
        fontSize: 13,
        fontWeight: '600',
    },
    form: {
        marginBottom: 28,
    },
    inputGroup: {
        marginBottom: 18,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: C.muted,
        marginBottom: 9,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: C.surfaceBorder,
        paddingHorizontal: 18,
    },
    inputWrapFocused: {
        borderColor: C.accent,
        backgroundColor: '#FFFFFF',
    },
    input: {
        flex: 1,
        paddingVertical: 17,
        fontSize: 16,
        color: C.text,
        fontWeight: '500',
    },
    eyeBtn: {
        paddingLeft: 10,
        paddingVertical: 4,
    },
    forgotRow: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 13,
        color: C.muted,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    cta: {
        backgroundColor: C.accent,
        borderRadius: 20,
        paddingVertical: 19,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: C.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaDisabled: {
        opacity: 0.55,
    },
    ctaText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: C.surfaceBorder,
    },
    dividerLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: C.muted,
        marginHorizontal: 14,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 28,
    },
    socialBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: C.surfaceBorder,
        gap: 6,
    },
    socialIconG: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4285F4',
    },
    socialLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: C.text,
        letterSpacing: 0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 14,
        color: C.muted,
    },
    footerLink: {
        fontSize: 14,
        color: C.accent,
        fontWeight: '800',
        textDecorationLine: 'underline',
    },
});
