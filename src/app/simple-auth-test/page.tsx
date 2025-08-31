'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function SimpleAuthTestPage() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('SimpleAuthTest: Setting up direct Firebase listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('SimpleAuthTest: Firebase user state changed:', user ? { 
        uid: user.uid, 
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified 
      } : 'null');
      
      setFirebaseUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Simple Auth Test (Direct Firebase)</CardTitle>
            <CardDescription>
              Testing Firebase Auth without Firestore complications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold">Firebase User Status:</h3>
              <p className={firebaseUser ? 'text-green-600' : 'text-red-600'}>
                {firebaseUser ? 'Logged In' : 'Not Logged In'}
              </p>
            </div>

            {firebaseUser && (
              <div className="mt-6">
                <h3 className="font-semibold mb-2">Firebase User Object:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    emailVerified: firebaseUser.emailVerified,
                    metadata: {
                      creationTime: firebaseUser.metadata.creationTime,
                      lastSignInTime: firebaseUser.metadata.lastSignInTime
                    }
                  }, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <Button onClick={() => router.push('/auth/login')}>
                Go to Login
              </Button>
              <Button onClick={() => router.push('/debug-auth')} variant="outline">
                Go to Debug Auth
              </Button>
              {firebaseUser && (
                <Button 
                  onClick={async () => {
                    await auth.signOut();
                    router.push('/auth/login');
                  }} 
                  variant="destructive"
                >
                  Sign Out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
