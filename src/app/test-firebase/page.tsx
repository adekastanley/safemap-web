'use client';

import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestFirebasePage() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('test123');
  const [status, setStatus] = useState<string[]>([]);
  
  const addStatus = (message: string) => {
    console.log(message);
    setStatus(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testFirebaseConnection = async () => {
    setStatus([]);
    addStatus('🔧 Testing Firebase connection...');
    
    try {
      // Test 1: Check Firebase Config
      addStatus('📋 Checking Firebase configuration...');
      const config = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      };
      
      if (!config.apiKey) {
        addStatus('❌ NEXT_PUBLIC_FIREBASE_API_KEY is missing');
        return;
      }
      if (!config.authDomain) {
        addStatus('❌ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing');
        return;
      }
      if (!config.projectId) {
        addStatus('❌ NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing');
        return;
      }
      
      addStatus('✅ Firebase config looks good');
      addStatus(`📊 Project ID: ${config.projectId}`);
      
      // Test 2: Test Firestore connection
      addStatus('🗄️  Testing Firestore connection...');
      const testDoc = doc(db, 'test', 'connection');
      await setDoc(testDoc, {
        test: true,
        timestamp: new Date(),
      });
      addStatus('✅ Firestore write successful');
      
      const docSnap = await getDoc(testDoc);
      if (docSnap.exists()) {
        addStatus('✅ Firestore read successful');
      } else {
        addStatus('❌ Firestore read failed');
      }
      
      // Test 3: Test Auth
      addStatus('🔐 Testing Firebase Auth...');
      addStatus(`🧪 Attempting to create test user: ${email}`);
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        addStatus(`✅ Test user created: ${userCredential.user.uid}`);
        
        // Try to sign out and sign back in
        await auth.signOut();
        addStatus('✅ Sign out successful');
        
        const signInResult = await signInWithEmailAndPassword(auth, email, password);
        addStatus(`✅ Sign in successful: ${signInResult.user.uid}`);
        
        await auth.signOut();
        addStatus('✅ Final sign out successful');
        
      } catch (authError: any) {
        if (authError.code === 'auth/email-already-in-use') {
          addStatus('⚠️  Test user already exists, trying to sign in...');
          try {
            const signInResult = await signInWithEmailAndPassword(auth, email, password);
            addStatus(`✅ Sign in successful with existing user: ${signInResult.user.uid}`);
            await auth.signOut();
            addStatus('✅ Sign out successful');
          } catch (signInError) {
            addStatus(`❌ Sign in failed: ${signInError}`);
          }
        } else {
          addStatus(`❌ Auth error: ${authError.message} (${authError.code})`);
        }
      }
      
      addStatus('🎉 Firebase test completed!');
      
    } catch (error: any) {
      addStatus(`❌ Test failed: ${error.message}`);
      console.error('Firebase test error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Firebase Connection Test</CardTitle>
            <CardDescription>
              Test your Firebase configuration and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label>Test Email:</label>
              <Input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label>Test Password:</label>
              <Input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="test123"
              />
            </div>
            
            <Button onClick={testFirebaseConnection} className="w-full">
              Run Firebase Test
            </Button>
            
            {status.length > 0 && (
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <h3 className="font-semibold mb-2">Test Results:</h3>
                <div className="font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                  {status.map((msg, i) => (
                    <div key={i} className={`${
                      msg.includes('❌') ? 'text-red-600' :
                      msg.includes('✅') ? 'text-green-600' :
                      msg.includes('⚠️') ? 'text-yellow-600' :
                      'text-gray-700'
                    }`}>
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
