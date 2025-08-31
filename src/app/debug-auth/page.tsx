'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function DebugAuthPage() {
  const { user, loading, isAdmin, isAuthenticated, canManageUsers } = useAuth();
  const router = useRouter();

  const [projectInfo, setProjectInfo] = useState<{ projectId?: string } | null>(null);
  const [uidDoc, setUidDoc] = useState<any>(null);
  const [uidDocSingular, setUidDocSingular] = useState<any>(null);
  const [emailDoc, setEmailDoc] = useState<any>(null);
  const [emailDocSingular, setEmailDocSingular] = useState<any>(null);
  const [uidFieldDoc, setUidFieldDoc] = useState<any>(null);
  const [claims, setClaims] = useState<any>(null);

  useEffect(() => {
    // Read Firebase app options (projectId)
    try {
      const projectId = (auth.app.options as any)?.projectId;
      setProjectInfo({ projectId });
    } catch (e) {
      setProjectInfo({ projectId: undefined });
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!user?.uid) return;
      try {
        const tokenResult = await auth.currentUser?.getIdTokenResult();
        setClaims(tokenResult?.claims || null);
      } catch (e) {
        setClaims({ error: (e as Error).message });
      }

      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        setUidDoc(snap.exists() ? { id: snap.id, ...snap.data() } : { exists: false });
      } catch (e) {
        setUidDoc({ error: (e as Error).message });
      }

      try {
        const refS = doc(db, 'user', user.uid);
        const snapS = await getDoc(refS);
        setUidDocSingular(snapS.exists() ? { id: snapS.id, ...snapS.data() } : { exists: false });
      } catch (e) {
        setUidDocSingular({ error: (e as Error).message });
      }

      // Query by uid field in top-level users
      try {
        const qu = query(collection(db, 'users'), where('uid', '==', user.uid));
        const qsu = await getDocs(qu);
        if (!qsu.empty) {
          const d = qsu.docs[0];
          setUidFieldDoc({ id: d.id, ...d.data() });
        } else {
          setUidFieldDoc({ found: false });
        }
      } catch (e) {
        setUidFieldDoc({ error: (e as Error).message });
      }

      if (user.email) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const qs = await getDocs(q);
          if (!qs.empty) {
            const d = qs.docs[0];
            setEmailDoc({ id: d.id, ...d.data() });
          } else {
            setEmailDoc({ found: false });
          }
        } catch (e) {
          setEmailDoc({ error: (e as Error).message });
        }
        try {
          const q2 = query(collection(db, 'user'), where('email', '==', user.email));
          const qs2 = await getDocs(q2);
          if (!qs2.empty) {
            const d = qs2.docs[0];
            setEmailDocSingular({ id: d.id, ...d.data() });
          } else {
            setEmailDocSingular({ found: false });
          }
        } catch (e) {
          setEmailDocSingular({ error: (e as Error).message });
        }
      }
    };
    run();
  }, [user?.uid, user?.email]);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto p-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Debug</CardTitle>
            <CardDescription>
              Current authentication state, Firebase project, and Firestore role documents
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Loading:</h3>
                <p className={loading ? 'text-orange-600' : 'text-green-600'}>
                  {loading ? 'Yes' : 'No'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Is Authenticated:</h3>
                <p className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Is Admin:</h3>
                <p className={isAdmin ? 'text-green-600' : 'text-red-600'}>
                  {isAdmin ? 'Yes' : 'No'}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Can Manage Users:</h3>
                <p className={canManageUsers ? 'text-green-600' : 'text-red-600'}>
                  {canManageUsers ? 'Yes' : 'No'}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">User Object</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Token Claims</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(claims, null, 2)}
                </pre>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Firestore users/{'{uid}'}</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(uidDoc, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Firestore user/{'{uid}'} (singular)</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(uidDocSingular, null, 2)}
                </pre>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Firestore users (by uid field)</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(uidFieldDoc, null, 2)}
                </pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Firestore users (by email)</h3>
                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                  {JSON.stringify(emailDoc, null, 2)}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Firestore user (singular) by email</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(emailDocSingular, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Firebase Project</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(projectInfo, null, 2)}
              </pre>
            </div>

            <div className="flex gap-4 mt-6">
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
              <Button onClick={() => router.push('/auth/login')} variant="outline">
                Go to Login
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
