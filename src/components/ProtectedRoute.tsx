'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('ProtectedRoute: Auth state check:', { 
      loading, 
      isAuthenticated, 
      isAdmin, 
      user: user ? { uid: user.uid, email: user.email, role: user.role } : null 
    });
    
    if (!loading) {
      if (!isAuthenticated) {
        console.log('ProtectedRoute: User not authenticated, redirecting to login');
        router.push(redirectTo);
        return;
      }

      if (requireAdmin && !isAdmin) {
        console.log('ProtectedRoute: User not admin, redirecting to dashboard');
        router.push('/dashboard'); // Redirect non-admin users to regular dashboard
        return;
      }
      
      console.log('ProtectedRoute: Access granted');
    }
  }, [user, loading, isAuthenticated, isAdmin, requireAdmin, router, redirectTo]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (requireAdmin && !isAdmin) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
}
