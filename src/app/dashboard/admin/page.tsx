'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
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
      console.error('Error loading users:', error);
      setMessage('❌ Error loading users');
    } finally {
      setLoadingUsers(false);
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
      // Reload users after sync
      await loadUsers();
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
      setMessage('✅ User promoted to admin successfully!');
      await loadUsers(); // Reload the user list
    } catch (error) {
      console.error('Error promoting user:', error);
      setMessage('❌ Error promoting user to admin');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Only administrators can access this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Utilities</CardTitle>
          <CardDescription>
            Manage user roles and sync Firebase Auth users to Firestore
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">User Sync</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will copy all Firebase Auth users to Firestore with default &apos;user&apos; role.
              Existing users will be skipped.
            </p>
            <Button 
              onClick={syncUsers} 
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Syncing...' : 'Sync All Users'}
            </Button>
          </div>
          
          {message && (
            <div className={`p-4 rounded-md ${message.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="font-semibold text-blue-800">Instructions:</h4>
            <ol className="list-decimal list-inside mt-2 text-sm text-blue-700 space-y-1">
              <li>First, sync all users to create Firestore documents</li>
              <li>Go to Firebase Console → Firestore Database</li>
              <li>Find the &apos;users&apos; collection</li>
              <li>Edit any user document and change their &apos;role&apos; field from &apos;user&apos; to &apos;admin&apos;</li>
              <li>Save the changes</li>
              <li>The user will now have admin access and see admin menu items</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
