import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Image, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
    FadeInDown,
    FadeInUp,
    withRepeat,
    withTiming,
    useSharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');

const C = {
    bg: '#FFFFFF',
    surface: '#F1F5F9',
    surfaceBorder: '#E2E8F0',
    accent: '#1CB0A8',
    blue: '#4A90E2',
    text: '#0F172A',
    muted: '#64748B',
};

export const SplashScreenComponent: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
    const pulseValue = useSharedValue(0.3);

    useEffect(() => {
        pulseValue.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);

        const timer = setTimeout(() => {
            SplashScreen.hideAsync();
            onFinish();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onFinish]);

    const animatedDotStyle = useAnimatedStyle(() => ({
        opacity: pulseValue.value,
        transform: [{ scale: 0.8 + (pulseValue.value * 0.4) }]
    }));

    return (
        <View style={s.container}>
            <View style={s.glowTopRight} />
            <View style={s.glowBottomLeft} />

            <Animated.View
                style={s.logoContainer}
                entering={FadeInUp.duration(800)}
            >
                <View style={s.logoBox}>
                    <Image 
                        source={require('../../assets/images/club-logo.png')} 
                        style={s.logoImage}
                        resizeMode="contain"
                    />
                </View>
                <Text style={s.appName}>VITAL</Text>
                <Text style={s.appSub}>C  L  U  B</Text>
            </Animated.View>

            <Animated.View
                style={s.taglineContainer}
                entering={FadeInDown.delay(400).duration(800)}
            >
                <Text style={s.tagline}>SCIENTIFIC PERFORMANCE LAB</Text>
            </Animated.View>

            <Animated.View
                style={s.dotsContainer}
                entering={FadeInUp.delay(1000).duration(600)}
            >
                <Animated.View style={[s.dot, animatedDotStyle]} />
            </Animated.View>
        </View>
    );
};

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: C.bg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowTopRight: {
        position: 'absolute',
        top: -120,
        right: -120,
        width: 400,
        height: 400,
        borderRadius: 200,
        backgroundColor: 'rgba(28, 176, 168, 0.05)',
    },
    glowBottomLeft: {
        position: 'absolute',
        bottom: -150,
        left: -150,
        width: 450,
        height: 450,
        borderRadius: 225,
        backgroundColor: 'rgba(74, 144, 226, 0.05)',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logoBox: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    appName: {
        fontSize: 42,
        fontWeight: '900',
        color: C.text,
        letterSpacing: -1.5,
    },
    appSub: {
        fontSize: 14,
        fontWeight: '700',
        color: C.accent,
        letterSpacing: 8,
        marginTop: -4,
        marginLeft: 8,
    },
    taglineContainer: {
        marginTop: 20,
        paddingHorizontal: 20,
        paddingVertical: 8,
        backgroundColor: C.surface,
        borderRadius: 100,
    },
    tagline: {
        fontSize: 10,
        fontWeight: '800',
        color: C.muted,
        letterSpacing: 1.5,
    },
    dotsContainer: {
        position: 'absolute',
        bottom: 60,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: C.accent,
    },
});
