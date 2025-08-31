'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: string;
}

interface SimpleAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export function SimpleAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('SimpleAuthContext: Setting up Firebase listener');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('SimpleAuthContext: onAuthStateChanged triggered', firebaseUser ? {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      } : 'null');

      if (firebaseUser) {
        // Create a simple user object without Firestore
        const simpleUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          role: 'user' // Default role
        };
        
        console.log('SimpleAuthContext: Setting user state to:', simpleUser);
        setUser(simpleUser);
      } else {
        console.log('SimpleAuthContext: Setting user state to null');
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    console.log('SimpleAuthContext: signIn called');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('SimpleAuthContext: signInWithEmailAndPassword successful', result.user.uid);
      // User will be set by onAuthStateChanged listener
    } catch (error) {
      console.error('SimpleAuthContext: signIn error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    console.log('SimpleAuthContext: signUp called');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('SimpleAuthContext: createUserWithEmailAndPassword successful', result.user.uid);
      // User will be set by onAuthStateChanged listener
    } catch (error) {
      console.error('SimpleAuthContext: signUp error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('SimpleAuthContext: logout called');
    try {
      await signOut(auth);
      console.log('SimpleAuthContext: signOut successful');
      // User will be cleared by onAuthStateChanged listener
    } catch (error) {
      console.error('SimpleAuthContext: logout error:', error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    signIn,
    signUp,
    logout,
  };

  console.log('SimpleAuthContext: Current state', { 
    user: user ? { uid: user.uid, email: user.email, role: user.role } : null, 
    isAuthenticated: !!user, 
    loading 
  });

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
}

export function useSimpleAuth() {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
}
