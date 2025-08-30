'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Ticket, LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import DbTester from '@/components/db-tester';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(username, password);
      toast({
        title: 'ورود موفقیت‌آمیز',
        description: "خوش آمدید!",
      });
      // The useEffect will handle the redirect
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'ورود ناموفق',
        description: (error as Error).message,
      });
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center justify-center text-center mb-8">
        <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
          <Ticket className="h-12 w-12" />
        </div>
        <h1 className="text-5xl font-headline font-bold text-primary">موپن</h1>
        <p className="text-muted-foreground mt-2">از پیگیری تا حصول نتیجه، فقط با یک کوپن</p>
      </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">ورود</CardTitle>
          <CardDescription>برای دسترسی به داشبورد، اطلاعات کاربری خود را وارد کنید.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">نام کاربری (ایمیل)</Label>
              <Input
                id="username"
                type="text"
                placeholder="sales_agent_1"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'در حال ورود...' : 'ورود'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="w-full max-w-sm">
        <DbTester />
      </div>
      <footer className="mt-8 text-sm text-muted-foreground">
        <p>پس از سید کردن دیتابیس، از `sales_agent_1` / `password` یا `sales_manager` / `password` استفاده کنید</p>
      </footer>
    </main>
  );
}
