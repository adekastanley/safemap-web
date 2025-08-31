import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Check if any users already exist
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    if (!usersSnapshot.empty) {
      return NextResponse.json(
        { error: 'Setup already completed - users exist' },
        { status: 400 }
      );
    }

    // Parse request body
    const { email, password, displayName } = await request.json();

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Create the admin user
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Update profile
    await updateProfile(user, {
      displayName,
    });

    // Create user document in Firestore with admin role
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName,
      role: 'admin', // Set as admin
      createdAt: new Date(),
      updatedAt: new Date(),
      isInitialAdmin: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Initial admin user created successfully',
      uid: user.uid,
    });

  } catch (error) {
    console.error('Setup error:', error);
    
    let errorMessage = 'Failed to create admin user';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
