'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
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

function classNames(...s: string[]) { return s.filter(Boolean).join(' '); }

function UserStatusRegionsRow({ uid, currentRole, onUpdated }: { uid: string; currentRole: string; onUpdated: () => Promise<void> | void }) {
  const [status, setStatus] = useState<'active'|'blocked'|'banned'>('active');
  const [regions, setRegions] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const update = async () => {
    setLoading(true);
    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/admin/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ targetUid: uid, updates: { status, assignedRegions: regions.split(',').map(s=>s.trim()).filter(Boolean) } })
      });
      if (!res.ok) {
        const data = await res.json().catch(()=>({}));
        throw new Error(data.error || 'Failed to update user');
      }
      await onUpdated();
    } catch (e) {
      console.error('Update user failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3 items-center">
        <label className="text-sm text-gray-600">Status</label>
        <select value={status} onChange={e=>setStatus(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
          <option value="banned">Banned</option>
        </select>
        <label className="text-sm text-gray-600">Assigned Regions (comma-separated)</label>
        <input value={regions} onChange={e=>setRegions(e.target.value)} placeholder="e.g., Lagos Mainland, Ikeja" className="border rounded px-2 py-1 text-sm flex-1" />
        <Button size="sm" variant="outline" onClick={update} disabled={loading}>{loading? 'Saving...' : 'Save'}</Button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

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
    if (!isSuperAdmin) {
      setMessage('❌ Only super admins can promote users to admin');
      return;
    }

    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/admin/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: userId, role: 'admin' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to promote');
      }
      setMessage('✅ User promoted to admin successfully!');
      await loadUsers();
    } catch (error: any) {
      console.error('Error promoting user:', error);
      setMessage(`❌ Error promoting user to admin: ${error.message || ''}`);
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    if (!isSuperAdmin) {
      setMessage('❌ Only super admins can demote admin users');
      return;
    }

    if (userId === user?.uid) {
      setMessage('❌ You cannot demote yourself');
      return;
    }

    try {
      const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken();
      const res = await fetch('/api/admin/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUid: userId, role: 'user' })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to demote');
      }
      setMessage('✅ User demoted from admin successfully!');
      await loadUsers();
    } catch (error: any) {
      console.error('Error demoting user:', error);
      setMessage(`❌ Error demoting user from admin: ${error.message || ''}`);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <ProtectedRoute requireAdmin>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Management</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin ? 'Manage user roles and system administration' : 'View system information and sync users'}
        </p>
      </div>

      {/* User Role Badge */}
      <div className="flex items-center gap-2">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          user?.role === 'superadmin' 
            ? 'bg-purple-100 text-purple-800' 
            : user?.role === 'admin'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {user?.role === 'superadmin' ? '👑 Super Admin' : 
           user?.role === 'admin' ? '🛡️ Admin' : '👤 User'}
        </div>
      </div>

      {/* User Sync Card - Only for SuperAdmin */}
      {isSuperAdmin && (
      <Card>
        <CardHeader>
          <CardTitle>User Synchronization</CardTitle>
          <CardDescription>
            Sync Firebase Auth users to Firestore with default roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              This will copy all Firebase Auth users to Firestore with default 'user' role.
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
        </CardContent>
      </Card>
      )}

      {/* User Management Card - Only for SuperAdmin */}
      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage users (roles, status, assigned regions)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.uid} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{u.displayName || 'No name'}</div>
                        <div className="text-sm text-gray-600">{u.email || 'No email'}</div>
                      </div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        u.role === 'superadmin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : u.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 items-center">
                      {u.role === 'user' && (
                        <Button size="sm" onClick={() => promoteToAdmin(u.uid)} disabled={updating===u.uid}>
                          {updating===u.uid? 'Updating...' : 'Promote to Admin'}
                        </Button>
                      )}
                      {u.role === 'admin' && u.uid !== user?.uid && (
                        <Button size="sm" variant="outline" onClick={() => demoteFromAdmin(u.uid)} disabled={updating===u.uid}>
                          {updating===u.uid? 'Updating...' : 'Demote to User'}
                        </Button>
                      )}
                      {u.role === 'superadmin' && (
                        <span className="text-xs text-purple-600">Cannot modify superadmin role</span>
                      )}
                    </div>

                    {/* Status + Regions */}
                    <UserStatusRegionsRow uid={u.uid} currentRole={u.role} onUpdated={loadUsers} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Role System Information */}
      <Card>
        <CardHeader>
          <CardTitle>Role System Information</CardTitle>
          <CardDescription>
            Understanding the user role hierarchy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <div className="font-semibold text-purple-800 mb-2">👑 Super Admin</div>
                <div className="text-sm text-gray-600">
                  • Full system access<br/>
                  • Can promote/demote admins<br/>
                  • Manually assigned only<br/>
                  • Cannot be changed via UI
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-semibold text-blue-800 mb-2">🛡️ Admin</div>
                <div className="text-sm text-gray-600">
                  • Manage alerts and users<br/>
                  • Send SMS notifications<br/>
                  • Access admin features<br/>
                  • Promoted by Super Admin
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="font-semibold text-gray-800 mb-2">👤 User</div>
                <div className="text-sm text-gray-600">
                  • View map and alerts<br/>
                  • Basic app functionality<br/>
                  • Default role for new users<br/>
                  • Cannot access admin features
                </div>
              </div>
            </div>
            
            {!isSuperAdmin && (
              <div className="mt-6 p-4 bg-amber-50 rounded-md">
                <h4 className="font-semibold text-amber-800">Note for Admins:</h4>
                <p className="mt-2 text-sm text-amber-700">
                  To assign the first Super Admin role, manually edit the 'users' collection in Firebase Console 
                  and change a user's 'role' field from 'admin' to 'superadmin'. Super Admins can then promote other users to admin through this interface.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </ProtectedRoute>
  );
}
