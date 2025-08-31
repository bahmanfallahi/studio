'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase';
import { Database, LoaderCircle } from 'lucide-react';

export default function DbTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      // We perform a simple, non-existent document read.
      // Supabase doesn't charge for this kind of lightweight query.
      // This is a safe way to check if connection and RLS are okay.
      const { error } = await supabase.from('products').select('id').limit(1);

      if (error) throw error;

      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error("Database connection test failed:", error);
      toast({
        variant: 'destructive',
        title: 'اتصال ناموفق',
        description: error.message || 'امکان اتصال به پایگاه داده وجود نداشت. کنسول را برای جزئیات بررسی کنید.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            تست‌کننده اتصال پایگاه داده
          </CardTitle>
          <CardDescription>
            برای تأیید اتصال به پایگاه داده Supabase، روی دکمه کلیک کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestConnection} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />
                در حال تست...
              </>
            ) : (
              'تست اتصال پایگاه داده'
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isSuccessModalOpen} onOpenChange={setSuccessModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>اتصال موفقیت‌آمیز بود!</AlertDialogTitle>
            <AlertDialogDescription>
              برنامه با موفقیت به پایگاه داده Supabase متصل شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessModalOpen(false)}>
              عالی!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
