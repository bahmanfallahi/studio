'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { User } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, doc, writeBatch } from 'firebase/firestore';
import { LoaderCircle, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [salesAgents, setSalesAgents] = useState<User[]>([]);
  const [limits, setLimits] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAgents = async () => {
      if (currentUser?.role !== 'manager') return;
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("role", "==", "sales"));
        const querySnapshot = await getDocs(q);
        const agents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setSalesAgents(agents);

        const initialLimits = agents.reduce((acc, agent) => {
          acc[agent.id] = agent.coupon_limit_per_month || 10;
          return acc;
        }, {} as { [key: string]: number });
        setLimits(initialLimits);

      } catch (error) {
        console.error("Error fetching sales agents:", error);
        toast({ variant: 'destructive', title: 'خطا', description: 'امکان دریافت لیست نمایندگان فروش وجود نداشت.' });
      }
      setLoading(false);
    };

    fetchAgents();
  }, [currentUser, toast]);

  const handleLimitChange = (agentId: string, value: string) => {
    const numberValue = parseInt(value, 10);
    setLimits(prev => ({
      ...prev,
      [agentId]: isNaN(numberValue) ? 0 : numberValue,
    }));
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      Object.keys(limits).forEach(agentId => {
        const agentRef = doc(db, "users", agentId);
        batch.update(agentRef, { coupon_limit_per_month: limits[agentId] });
      });
      await batch.commit();

      // Update local state to match saved data
      setSalesAgents(prev => prev.map(agent => ({
        ...agent,
        coupon_limit_per_month: limits[agent.id],
      })));

      toast({ title: 'موفقیت', description: 'سقف کوپن‌ها با موفقیت به‌روز شد.' });
    } catch (error) {
      console.error("Error saving limits:", error);
      toast({ variant: 'destructive', title: 'ذخیره ناموفق', description: 'امکان به‌روزرسانی سقف‌ها وجود نداشت.' });
    }
    setIsSaving(false);
  };

  if (currentUser?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">دسترسی غیرمجاز</h1>
        <p className="text-muted-foreground">شما اجازه مشاهده این صفحه را ندارید.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoaderCircle className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">تنظیمات</h1>
          <p className="text-muted-foreground">تنظیمات برنامه و مجوزهای نمایندگان را مدیریت کنید.</p>
        </div>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving ? <LoaderCircle className="ml-2 h-4 w-4 animate-spin" /> : <Save className="ml-2 h-4 w-4" />}
            {isSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>سقف ماهانه کوپن‌ها</CardTitle>
          <CardDescription>
            حداکثر تعداد کوپن‌هایی که هر نماینده فروش می‌تواند در هر ماه تقویمی ایجاد کند را تنظیم کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نماینده فروش</TableHead>
                <TableHead className="w-[200px] text-right">سقف کوپن</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesAgents.map(agent => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium text-right">{agent.full_name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={limits[agent.id] || ''}
                      onChange={(e) => handleLimitChange(agent.id, e.target.value)}
                      min="0"
                      className="w-full"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
