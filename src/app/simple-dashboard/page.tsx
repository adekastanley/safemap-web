'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { SimpleAuthProvider, useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { SimpleProtectedRoute } from '@/components/SimpleProtectedRoute';

function DashboardContent() {
  const { user, logout } = useSimpleAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/simple-auth-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">🎉 Simple Dashboard</CardTitle>
            <CardDescription>
              You successfully accessed a protected route using SimpleAuth!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Current User:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            <div className="flex gap-4">
              <Button onClick={() => router.push('/simple-auth-test')} variant="outline">
                Go to Simple Auth Test
              </Button>
              <Button onClick={() => router.push('/simple-auth-login')} variant="outline">
                Go to Simple Login
              </Button>
              <Button onClick={handleLogout} variant="destructive">
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SimpleDashboardPage() {
  return (
    <SimpleAuthProvider>
      <SimpleProtectedRoute>
        <DashboardContent />
      </SimpleProtectedRoute>
    </SimpleAuthProvider>
  );
}
