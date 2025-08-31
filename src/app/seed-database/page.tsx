'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { seedDatabaseAction } from './actions';

export default function SeedPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

    const handleSeed = async () => {
        setLoading(true);
        setResult(null);
        try {
            const response = await seedDatabaseAction();
            setResult(response);
        } catch (error: any) {
            setResult({ success: false, message: error.message || "An unknown error occurred." });
        }
        setLoading(false);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">پر کردن پایگاه داده Supabase</CardTitle>
                    <CardDescription>
                        برای پر کردن پایگاه داده Supabase خود با داده‌های اولیه (کاربران، محصولات، کوپن‌ها) روی دکمه زیر کلیک کنید. این عملیات ابتدا تمام داده‌های موجود را پاک می‌کند.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSeed} disabled={loading || result?.success === true} className="w-full">
                        {loading && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                        {loading ? 'در حال پر کردن...' : 'شروع عملیات'}
                    </Button>

                    {result && (
                        <div className={`mt-4 p-4 rounded-md flex items-start space-x-3 rtl:space-x-reverse ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {result.success ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertTriangle className="h-5 w-5 flex-shrink-0" />}
                            <div className="flex-grow">
                                <p className="font-semibold">{result.success ? 'موفقیت!' : 'خطا'}</p>
                                <p className="text-sm">{result.message}</p>
                                {result.success && (
                                     <Button asChild variant="link" className="p-0 h-auto mt-2 text-green-900 font-bold">
                                        <Link href="/">رفتن به صفحه ورود</Link>
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}
