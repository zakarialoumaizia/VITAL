import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { AuthNavigator } from '@/navigation/auth-navigator';
import AppTabs from '@/components/app-tabs';
import { AdminDashboard } from '@/screens/admin/admin-dashboard';
import { PartnerDashboard } from '@/screens/partner/partner-dashboard';
import { MemberDashboard } from '@/screens/member/member-dashboard';
import { SponsorDashboard } from '@/screens/sponsor/sponsor-dashboard';
import VaultScreen from '@/screens/vault-screen';

import { Slot } from 'expo-router';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/theme-context';

function RootLayoutContent() {
  const { theme, isDark } = useAppTheme();
  const { isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Slot />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppThemeProvider>
        <RootLayoutContent />
      </AppThemeProvider>
    </AuthProvider>
  );
}
