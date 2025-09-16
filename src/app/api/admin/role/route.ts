import { NextRequest, NextResponse } from 'next/server';

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

    // Use Firestore REST PATCH with the caller's ID token for security and to avoid Admin SDK
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      return NextResponse.json({ error: 'Server not configured: missing projectId' }, { status: 500 });
    }

    const url = new URL(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(targetUid)}`);
    url.searchParams.append('updateMask.fieldPaths', 'role');
    url.searchParams.append('updateMask.fieldPaths', 'updatedAt');

    const resp = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          role: { stringValue: role },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      console.error('Firestore REST error:', err);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Role API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

