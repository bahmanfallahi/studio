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
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Database, LoaderCircle } from 'lucide-react';

export default function DbTester() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setSuccessModalOpen] = useState(false);
  const { toast } = useToast();

  const handleTestConnection = async () => {
    setIsLoading(true);
    try {
      // We perform a simple, non-existent document read.
      // Firestore does not charge for reading a non-existent document.
      // This is a safe way to check if rules allow reads and connection is okay.
      const testDocRef = doc(db, 'test_collection', 'test_doc');
      await getDoc(testDocRef);
      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error("Database connection test failed:", error);
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: error.message || 'Could not connect to the database. Check console for details.',
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
            Database Connection Tester
          </CardTitle>
          <CardDescription>
            Click the button to verify the connection to the Firebase Firestore database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleTestConnection} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Database Connection'
            )}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isSuccessModalOpen} onOpenChange={setSuccessModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Connection Successful!</AlertDialogTitle>
            <AlertDialogDescription>
              The application successfully connected to the Firebase Firestore database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSuccessModalOpen(false)}>
              Great!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
