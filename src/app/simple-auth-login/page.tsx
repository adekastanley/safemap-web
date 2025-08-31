'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimpleAuthProvider, useSimpleAuth } from '@/contexts/SimpleAuthContext';

function SimpleLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, user, isAuthenticated } = useSimpleAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('SimpleLoginForm: Attempting to sign in...');
      await signIn(email, password);
      console.log('SimpleLoginForm: Sign in completed, user state:', user);
      console.log('SimpleLoginForm: isAuthenticated:', isAuthenticated);
      
      // Navigate to dashboard after successful login
      setTimeout(() => {
        console.log('SimpleLoginForm: Navigating to dashboard');
        router.push('/dashboard');
      }, 1000); // Small delay to see the state change
    } catch (err: any) {
      console.error('SimpleLoginForm: Login error:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Show user info if logged in
  if (isAuthenticated && user) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-green-600">Successfully Logged In!</CardTitle>
          <CardDescription>Simple Auth Context Test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">User Info:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm mt-2">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
          
          <div>
            <p><strong>isAuthenticated:</strong> {isAuthenticated ? 'true' : 'false'}</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => router.push('/dashboard')}>
              Go to Dashboard
            </Button>
            <Button onClick={() => router.push('/simple-auth-test')} variant="outline">
              Go to Auth Test
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Simple Auth Login Test</CardTitle>
        <CardDescription>Testing login without Firestore complications</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button onClick={() => router.push('/simple-auth-test')} variant="link">
            Go to Simple Auth Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SimpleAuthLoginPage() {
  return (
    <SimpleAuthProvider>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <SimpleLoginForm />
      </div>
    </SimpleAuthProvider>
  );
}
