import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// POST /api/admin/user
// Body: { targetUid: string, updates: { role?: 'admin'|'user', status?: 'active'|'blocked'|'banned', assignedRegions?: string[] } }
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
    const { targetUid, updates } = body || {};

    if (!targetUid || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate fields
    const payloadUpdates: Record<string, any> = {};

    if (updates.role) {
      if (updates.role !== 'admin' && updates.role !== 'user') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      payloadUpdates.role = updates.role;
    }

    if (updates.status) {
      if (!['active', 'blocked', 'banned'].includes(updates.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      payloadUpdates.status = updates.status;
    }

    if (updates.assignedRegions) {
      if (!Array.isArray(updates.assignedRegions)) {
        return NextResponse.json({ error: 'assignedRegions must be an array' }, { status: 400 });
      }
      payloadUpdates.assignedRegions = updates.assignedRegions;
    }

    payloadUpdates.updatedAt = new Date().toISOString();

    const userRef = doc(db, 'users', targetUid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent assigning superadmin via this endpoint
    if (payloadUpdates.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot set superadmin via API' }, { status: 400 });
    }

    await updateDoc(userRef, payloadUpdates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
