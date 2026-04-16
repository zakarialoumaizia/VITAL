import React from 'react';
import { useAuth } from '@/context/auth-context';
import { AdminDashboard } from '@/screens/admin/admin-dashboard';
import { PartnerDashboard } from '@/screens/partner/partner-dashboard';
import { MemberDashboard } from '@/screens/member/member-dashboard';
import { SponsorDashboard } from '@/screens/sponsor/sponsor-dashboard';
import { AuthNavigator } from '@/navigation/auth-navigator';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <AuthNavigator />;

  switch (user.user_role?.toLowerCase()) {
    case 'admin':
      return <AdminDashboard />;
    case 'partner':
      return <PartnerDashboard />;
    case 'sponsor':
      return <SponsorDashboard />;
    default:
      return <MemberDashboard />;
  }
}
