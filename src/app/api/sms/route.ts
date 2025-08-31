import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/firebase';
import twilio from 'twilio';
import { collection, getDocs, query, where, limit, doc, getDoc } from 'firebase/firestore';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid token' },
        { status: 401 }
      );
    }

    // Verify the Firebase ID token
    const idToken = authHeader.split('Bearer ')[1];
    
    // Note: For server-side token verification, you'd need Firebase Admin SDK
    // For now, we'll extract the user info from the token payload (not secure for production)
    try {
      const base64Payload = idToken.split('.')[1];
      const payload = JSON.parse(atob(base64Payload));
      const userId = payload.user_id;
      const email = (payload.email || '').toLowerCase();
      const superEmail = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || '').toLowerCase();

      if (!userId) {
        throw new Error('Invalid token');
      }

      // Superadmin always authorized
      if (superEmail && email === superEmail) {
        // pass
      } else {
        // Check if user is admin (Firestore role) via REST using the same ID token
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        if (!projectId) {
          return NextResponse.json({ error: 'Server not configured: missing projectId' }, { status: 500 });
        }
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${encodeURIComponent(userId)}`;
        const resp = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        });
        if (!resp.ok) {
          return NextResponse.json(
            { error: 'Unauthorized - Admin access required' },
            { status: 403 }
          );
        }
        const data = await resp.json();
        const role = data?.fields?.role?.stringValue || 'user';
        if (role !== 'admin' && role !== 'superadmin') {
          return NextResponse.json(
            { error: 'Unauthorized - Admin access required' },
            { status: 403 }
          );
        }
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Parse request body
    const { phoneNumbers, message } = await request.json();

    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Phone numbers are required' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      return NextResponse.json(
        { error: 'SMS service not configured' },
        { status: 500 }
      );
    }

    // Send SMS messages
    const results = [];
    const errors = [];

    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
        });

        results.push({
          phoneNumber,
          sid: result.sid,
          status: result.status,
        });
      } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error);
        errors.push({
          phoneNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors,
    });

  } catch (error) {
    console.error('SMS API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
