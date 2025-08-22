'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface FirestoreUser {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
}

export default function SetupPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [hasUsers, setHasUsers] = useState(false);

  const checkExistingUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setHasUsers(!usersSnapshot.empty);
      
      const userData: FirestoreUser[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        userData.push({
          uid: doc.id,
          email: data.email || 'No email',
          displayName: data.displayName || 'No name',
          role: data.role || 'user'
        });
      });
      setUsers(userData);
    } catch (error) {
      console.error('Error checking users:', error);
    }
  };

  const syncUsers = async () => {
    setLoading(true);
    setMessage('');

    try {
      const functions = getFunctions();
      const syncFunction = httpsCallable(functions, 'syncAllAuthUsers');
      
      const result = await syncFunction();
      const data = result.data as any;
      
      setMessage(`✅ ${data.message}`);
      await checkExistingUsers();
    } catch (error: any) {
      console.error('Sync error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'admin',
        updatedAt: new Date().toISOString()
      });
      setMessage('✅ User promoted to admin! Please refresh the page to see admin features.');
      await checkExistingUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      setMessage('❌ Error promoting user to admin');
    }
  };

  useEffect(() => {
    if (user) {
      checkExistingUsers();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Please Sign In</CardTitle>
            <CardDescription>
              You need to be signed in to access the setup page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>SafeMap Initial Setup</CardTitle>
            <CardDescription>
              Set up user roles and permissions for your SafeMap application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!hasUsers ? (
              <div className="text-center py-8">
                <h3 className="text-lg font-semibold mb-4">No users found in Firestore</h3>
                <p className="text-gray-600 mb-6">
                  Click below to sync all Firebase Auth users to Firestore with default user roles.
                </p>
                <Button 
                  onClick={syncUsers} 
                  disabled={loading}
                  size="lg"
                  className="px-8"
                >
                  {loading ? 'Syncing Users...' : 'Sync All Users from Firebase Auth'}
                </Button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold mb-4">Manage User Roles</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click "Make Admin" next to any user to give them administrator privileges.
                </p>
                
                <div className="space-y-3">
                  {users.map((userData) => (
                    <div key={userData.uid} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                      <div>
                        <p className="font-medium">{userData.email}</p>
                        {userData.displayName && (
                          <p className="text-sm text-gray-600">{userData.displayName}</p>
                        )}
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          userData.role === 'admin' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userData.role}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {userData.role !== 'admin' && (
                          <Button
                            onClick={() => promoteToAdmin(userData.uid)}
                            variant="outline"
                            size="sm"
                          >
                            Make Admin
                          </Button>
                        )}
                        {userData.uid === user.uid && (
                          <span className="text-sm text-blue-600 font-medium">(You)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">What&apos;s Next?</h4>
                  <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                    <li>Promote at least one user to admin (preferably yourself)</li>
                    <li>Go to <a href="/dashboard" className="underline">Dashboard</a> to access the full application</li>
                    <li>Admins will see additional menu items like "Create Alert", "Manage", and "Admin"</li>
                    <li>Regular users can view alerts and use basic features</li>
                  </ol>
                </div>
              </div>
            )}
            
            {message && (
              <div className={`p-4 rounded-md ${
                message.startsWith('✅') 
                  ? 'bg-green-50 text-green-700' 
                  : 'bg-red-50 text-red-700'
              }`}>
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
