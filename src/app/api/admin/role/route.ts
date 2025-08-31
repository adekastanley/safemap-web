import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// POST /api/admin/role
// Body: { targetUid: string, role: 'admin' | 'user' }
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const base64Payload = idToken.split('.')[1];
    const payload = JSON.parse(atob(base64Payload));

    const requesterEmail = (payload.email || '').toLowerCase();
    const superEmail = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || '').toLowerCase();

    if (!superEmail || requesterEmail !== superEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { targetUid, role } = body || {};

    if (!targetUid || (role !== 'admin' && role !== 'user')) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Do not allow setting superadmin via API
    const userRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await updateDoc(userRef, {
      role,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

