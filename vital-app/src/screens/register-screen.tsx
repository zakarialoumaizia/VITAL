import React, { useState } from 'react';
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
import { useAuth } from '@/context/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

// ─── Design Tokens (LIGHT MODE) ───────────────────────────────────────────────
const C = {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceBorder: '#E2E8F0',
    surfaceFocus: '#F1F5F9',
    surfaceActive: 'rgba(28, 176, 168, 0.05)',
    surfaceActiveBorder: 'rgba(28, 176, 168, 0.4)',
    accent: '#1CB0A8',
    accentDim: 'rgba(28, 176, 168, 0.1)',
    blue: '#4A90E2',
    blueDim: 'rgba(74, 144, 226, 0.1)',
    text: '#0F172A',
    muted: '#64748B',
    error: '#EF4444',
    errorDim: 'rgba(239, 68, 68, 0.1)',
};

// ─── Shared Input Component ───────────────────────────────────────────────────
interface InputFieldProps {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (t: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address';
    editable?: boolean;
    rightElement?: React.ReactNode;
    autoComplete?: any;
}

const InputField: React.FC<InputFieldProps> = ({
    label, placeholder, value, onChangeText,
    secureTextEntry = false, keyboardType = 'default',
    editable = true, rightElement, autoComplete,
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

// ─── Role Card ────────────────────────────────────────────────────────────────
const RoleCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    desc: string;
    selected: boolean;
    onPress: () => void;
}> = ({ icon, title, desc, selected, onPress }) => (
    <TouchableOpacity
        style={[s.roleCard, selected && s.roleCardActive]}
        onPress={onPress}
        activeOpacity={0.75}
    >
        <View style={[s.roleIcon, selected && s.roleIconActive]}>
            {icon}
        </View>
        <View style={{ flex: 1 }}>
            <Text style={s.roleTitle}>{title}</Text>
            <Text style={s.roleDesc}>{desc}</Text>
        </View>
        {selected && <Feather name="check-circle" size={20} color={C.accent} />}
    </TouchableOpacity>
);

// ─── Register Screen ──────────────────────────────────────────────────────────
export const RegisterScreen: React.FC<{ onNavigateToLogin: () => void }> = ({
    onNavigateToLogin,
}) => {
    // Selection Method
    const [method, setMethod] = useState<'google' | 'email' | null>(null);
    
    // Form and Selection state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState<'member' | 'partner'>('member');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const { signUp, signInWithGoogle } = useAuth();

    const shakeAnim = React.useRef(new Animated.Value(0)).current;
    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const validateForm = () => {
        if (!firstName.trim()) { setError('Enter your first name'); shake(); return false; }
        if (!lastName.trim()) { setError('Enter your last name'); shake(); return false; }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Enter a valid email'); shake(); return false; }
        if (password.length < 8) { setError('Minimum 8 characters password'); shake(); return false; }
        if (password !== confirmPassword) { setError('Passwords do not match'); shake(); return false; }
        if (!agreedToTerms) { setError('Agree to terms to continue'); shake(); return false; }
        return true;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;
        try {
            setLoading(true);
            setError('');
            await signUp(firstName.trim(), lastName.trim(), email.trim(), password, role);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
            shake();
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleRegister = async () => {
        // Validation: user MUST have a role selected (it's default member, but good to check)
        if (!role) {
            setError('Please select your role first');
            shake();
            return;
        }
        try {
            setLoading(true);
            setError('');
            await signInWithGoogle(role);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Google registration failed');
            shake();
        } finally {
            setLoading(false);
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
                    <View style={s.topNav}>
                        <TouchableOpacity
                            style={s.backBtn}
                            onPress={method === 'email' ? () => setMethod(null) : onNavigateToLogin}
                        >
                            <Feather name="arrow-left" size={20} color={C.text} />
                        </TouchableOpacity>
                        <Text style={s.stepLabel}>{method === 'email' ? 'ACCOUNT DETAILS' : 'CREATE ACCOUNT'}</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    {error ? (
                        <Animated.View style={[s.errorBanner, { transform: [{ translateX: shakeAnim }] }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Feather name="alert-triangle" size={14} color={C.error} />
                                <Text style={s.errorText}>{error}</Text>
                            </View>
                        </Animated.View>
                    ) : null}

                    <View style={s.headerBox}>
                        <Text style={s.headline}>START{'\n'}THRIVING.</Text>
                        <Text style={s.subline}>Choose your role and register to begin.</Text>
                    </View>

                    {/* Step 1: Role (Required for both methods) */}
                    <View style={s.roleContainer}>
                        <RoleCard
                            icon={<Feather name="user" size={20} color={role === 'member' ? C.accent : C.text} />}
                            title="MEMBER"
                            desc="I want to track progress and join programs."
                            selected={role === 'member'}
                            onPress={() => setRole('member')}
                        />
                        <RoleCard
                            icon={<Feather name="award" size={20} color={role === 'sponsor' ? C.accent : C.text} />}
                            title="SPONSOR"
                            desc="I want to support the club and see activities."
                            selected={role === 'sponsor'}
                            onPress={() => setRole('sponsor')}
                        />
                    </View>

                    {/* Step 2: Method Selection */}
                    {!method ? (
                        <View style={s.methodSelection}>
                            <TouchableOpacity
                                style={s.socialBtn}
                                onPress={handleGoogleRegister}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <View style={s.socialIconBox}>
                                    <Text style={s.socialIconG}>G</Text>
                                </View>
                                <View>
                                    <Text style={s.methodTitle}>Register with Google</Text>
                                    <Text style={s.methodSub}>Automatic setup with role</Text>
                                </View>
                                {loading && <ActivityIndicator color={C.accent} style={{ marginLeft: 'auto' }} />}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={s.emailChoiceBtn}
                                onPress={() => setMethod('email')}
                                activeOpacity={0.8}
                            >
                                <View style={s.emailIconBox}>
                                    <Feather name="mail" size={20} color={C.text} />
                                </View>
                                <View>
                                    <Text style={s.methodTitle}>Email & Password</Text>
                                    <Text style={s.methodSub}>Classic manual registration</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* Step 3: Manual Form (Email Only) */
                        <Animated.View style={s.form}>
                            <View style={s.nameRow}>
                                <View style={{ flex: 1 }}>
                                    <InputField label="FIRST NAME" placeholder="John" value={firstName} onChangeText={setFirstName} editable={!loading} />
                                </View>
                                <View style={{ width: 12 }} />
                                <View style={{ flex: 1 }}>
                                    <InputField label="LAST NAME" placeholder="Doe" value={lastName} onChangeText={setLastName} editable={!loading} />
                                </View>
                            </View>

                            <InputField label="EMAIL" placeholder="user@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" editable={!loading} />

                            <InputField label="PASSWORD" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} editable={!loading} rightElement={
                                <TouchableOpacity onPress={() => setShowPassword(v => !v)}><Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={C.muted} /></TouchableOpacity>
                            }/>

                            <InputField label="CONFIRM" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm} editable={!loading} rightElement={
                                <TouchableOpacity onPress={() => setShowConfirm(v => !v)}><Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={C.muted} /></TouchableOpacity>
                            }/>

                            <TouchableOpacity style={s.termsRow} onPress={() => setAgreedToTerms(v => !v)} activeOpacity={0.7}>
                                <View style={[s.checkbox, agreedToTerms && s.checkboxActive]}>
                                    {agreedToTerms && <Feather name="check" size={14} color="#FFF" />}
                                </View>
                                <Text style={s.termsText}>I agree to the <Text style={s.termsLink}>Terms</Text> & <Text style={s.termsLink}>Privacy</Text></Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={[s.cta, (loading || !agreedToTerms) && s.ctaDisabled]} onPress={handleRegister} disabled={loading || !agreedToTerms}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.ctaText}>CREATE ACCOUNT</Text>}
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    <View style={s.footer}>
                        <Text style={s.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={onNavigateToLogin}>
                            <Text style={s.footerLink}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
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
    topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.surfaceBorder, justifyContent: 'center', alignItems: 'center' },
    stepLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: C.muted },
    errorBanner: { backgroundColor: C.errorDim, borderLeftWidth: 3, borderLeftColor: C.error, borderRadius: 12, padding: 16, marginBottom: 20 },
    errorText: { color: C.error, fontSize: 13, fontWeight: '600' },
    headerBox: { marginBottom: 24 },
    headline: { fontSize: 38, fontWeight: '900', color: C.text, letterSpacing: -1.5, lineHeight: 42, marginBottom: 8 },
    subline: { fontSize: 14, color: C.muted, lineHeight: 21 },
    roleContainer: { gap: 12, marginBottom: 32 },
    roleCard: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1.5, borderColor: C.surfaceBorder, padding: 16 },
    roleCardActive: { borderColor: C.accent, shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
    roleIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
    roleIconActive: { backgroundColor: '#FFFFFF' },
    roleTitle: { color: C.text, fontSize: 13, fontWeight: '800' },
    roleDesc: { color: C.muted, fontSize: 11 },
    methodSelection: { gap: 16, marginBottom: 32 },
    socialBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.surfaceBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 3 },
    emailChoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: C.surfaceBorder },
    socialIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(66, 133, 244, 0.08)', justifyContent: 'center', alignItems: 'center' },
    emailIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.surfaceFocus, justifyContent: 'center', alignItems: 'center' },
    socialIconG: { fontSize: 22, fontWeight: 'bold', color: '#4285F4' },
    methodTitle: { fontSize: 15, fontWeight: '800', color: C.text },
    methodSub: { fontSize: 12, color: C.muted, marginTop: 2 },
    form: { marginBottom: 12 },
    nameRow: { flexDirection: 'row' },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: C.muted, marginBottom: 8 },
    inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: C.surfaceBorder, paddingHorizontal: 16 },
    inputWrapFocused: { borderColor: C.accent },
    input: { flex: 1, paddingVertical: 16, fontSize: 15, color: C.text },
    termsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2, borderColor: C.surfaceBorder, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: C.accent, borderColor: C.accent },
    termsText: { fontSize: 13, color: C.muted },
    termsLink: { color: C.accent, fontWeight: '700' },
    cta: { backgroundColor: C.accent, borderRadius: 22, paddingVertical: 20, alignItems: 'center', elevation: 4 },
    ctaDisabled: { opacity: 0.5 },
    ctaText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 32 },
    footerText: { fontSize: 14, color: C.muted },
    footerLink: { fontSize: 14, color: C.accent, fontWeight: '800', textDecorationLine: 'underline' },
});
