'use client';

import { useAuth } from '@/components/auth-provider';
import ManagerDashboard from '@/components/dashboard/manager-dashboard';
import AgentDashboard from '@/components/dashboard/agent-dashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return (
      <div>
        <Skeleton className="h-8 w-1/4 mb-4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="mt-6">
           <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-3xl font-bold font-headline tracking-tight">داشبورد</h1>
        <p className="text-muted-foreground">خوش آمدید، {profile.full_name}. گزارش امروز به این شرح است.</p>
      </div>
      {profile.role === 'manager' ? <ManagerDashboard /> : <AgentDashboard userProfile={profile}/>}
    </>
  );
}
