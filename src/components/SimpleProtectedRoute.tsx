'use client';

import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface SimpleProtectedRouteProps {
  children: React.ReactNode;
}

export function SimpleProtectedRoute({ children }: SimpleProtectedRouteProps) {
  const { user, isAuthenticated, loading } = useSimpleAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('SimpleProtectedRoute: Auth state check', {
      user: user ? { uid: user.uid, email: user.email } : null,
      isAuthenticated,
      loading
    });

    if (!loading && !isAuthenticated) {
      console.log('SimpleProtectedRoute: User not authenticated, redirecting to simple-auth-login');
      router.push('/simple-auth-login');
    }
  }, [user, isAuthenticated, loading, router]);

  if (loading) {
    console.log('SimpleProtectedRoute: Loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('SimpleProtectedRoute: Not authenticated, showing nothing (should redirect)');
    return null;
  }

  console.log('SimpleProtectedRoute: User authenticated, rendering children');
  return <>{children}</>;
}
