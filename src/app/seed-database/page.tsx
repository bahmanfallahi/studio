'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { seedDatabase } from '@/lib/firebase';
import { LoaderCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function SeedPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

    const handleSeed = async () => {
        setLoading(true);
        setResult(null);
        const response = await seedDatabase();
        setResult(response);
        setLoading(false);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-headline">Seed Firestore Database</CardTitle>
                    <CardDescription>
                        Click the button below to populate your Firestore database with initial data (users, products, coupons). This is a one-time operation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleSeed} disabled={loading || result?.success === true} className="w-full">
                        {loading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Seeding...' : 'Start Seeding'}
                    </Button>

                    {result && (
                        <div className={`mt-4 p-4 rounded-md flex items-start space-x-3 ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {result.success ? <CheckCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                            <div>
                                <p className="font-semibold">{result.success ? 'Success!' : 'Error'}</p>
                                <p className="text-sm">{result.message}</p>
                                {result.success && (
                                     <Button asChild variant="link" className="p-0 h-auto mt-2 text-green-800">
                                        <Link href="/">Go to Login Page</Link>
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