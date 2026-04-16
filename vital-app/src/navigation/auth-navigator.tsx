import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/auth-context';
import { SplashScreenComponent } from '@/components/splash-screen';
import { LoginScreen } from '@/screens/login-screen';
import { RegisterScreen } from '@/screens/register-screen';
import { ForgotPasswordScreen } from '@/screens/forgot-password-screen';
import { OTPScreen } from '@/screens/otp-screen';

type AuthStackParamList = {
    Splash: undefined;
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    OTP: { email?: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
    const { isLoading, user } = useAuth();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        if (!isLoading && user) {
            setShowSplash(false);
        }
    }, [isLoading, user]);

    if (showSplash) {
        return (
            <SplashScreenComponent
                onFinish={() => setShowSplash(false)}
            />
        );
    }

    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#050505' },
                animation: 'fade_from_bottom',
            }}
            initialRouteName="Login"
        >
            <Stack.Screen name="Login">
                {({ navigation }) => (
                    <LoginScreen
                        onNavigateToRegister={() => navigation.navigate('Register')}
                        onNavigateToForgotPassword={() => navigation.navigate('ForgotPassword')}
                    />
                )}
            </Stack.Screen>

            <Stack.Screen name="Register">
                {({ navigation }) => (
                    <RegisterScreen
                        onNavigateToLogin={() => navigation.navigate('Login')}
                    />
                )}
            </Stack.Screen>

            <Stack.Screen name="ForgotPassword">
                {({ navigation }) => (
                    <ForgotPasswordScreen
                        onBack={() => navigation.goBack()}
                    />
                )}
            </Stack.Screen>

            <Stack.Screen name="OTP">
                {({ navigation, route }) => (
                    <OTPScreen
                        email={route.params?.email}
                        onVerified={() => navigation.navigate('Login')}
                        onBack={() => navigation.goBack()}
                    />
                )}
            </Stack.Screen>
        </Stack.Navigator>
    );
};
