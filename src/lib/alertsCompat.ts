import { auth, db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

export type AlertType = 'test' | 'type1' | 'type2';
export type AlertStatus = 'active' | 'resolved' | 'false';

export type AlertDoc = {
  id: string;
  userId: string;
  type: AlertType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  locationName?: string | null; // human-readable area/locality
  locationState?: string | null; // state/region
  locationCountry?: string | null; // country
  createdAt: Timestamp | null;
  expiresAt?: Timestamp | null;
  upvotes?: number;
  downvotes?: number;
  status?: AlertStatus;
  resolvedAt?: Timestamp | null;
  resolvedBy?: string | null;
  falseFlaggedAt?: Timestamp | null;
  falseFlaggedBy?: string | null;
};

const ALERTS = 'alerts';

export async function createAlert(params: {
  type: AlertType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  locationState?: string;
  locationCountry?: string;
  ttlMinutes?: number;
}) {
  const { type, title, description, latitude, longitude, ttlMinutes = 15 } = params;

  const createdAt = serverTimestamp();
  const expiresAt = ttlMinutes > 0 ? Timestamp.fromMillis(Date.now() + ttlMinutes * 60 * 1000) : null;

  const ref = await addDoc(collection(db, ALERTS), {
    userId: auth.currentUser?.uid ?? 'anonymous',
    type,
    title,
    description,
    latitude,
    longitude,
    locationName: params.locationName || null,
    locationState: params.locationState || null,
    locationCountry: params.locationCountry || null,
    createdAt,
    expiresAt,
    upvotes: 0,
    downvotes: 0,
    status: 'active' as const,
    resolvedAt: null,
    resolvedBy: null,
    falseFlaggedAt: null,
    falseFlaggedBy: null,
  });

  return ref.id;
}

export function listenToAllAlerts(cb: (alerts: AlertDoc[]) => void): () => void {
  return onSnapshot(
    query(collection(db, ALERTS), orderBy('createdAt', 'desc')),
    (snap) => {
      const now = Timestamp.now();
      const items: AlertDoc[] = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AlertDoc, 'id'>),
        }))
        .filter((alert) => !alert.expiresAt || alert.expiresAt > now);
      cb(items);
    },
    (error) => {
      console.error('listenToAllAlerts error:', error);
      // On permission errors or other issues, still notify caller to stop spinners
      cb([]);
    }
  );
}

export function listenToAlertHistory(cb: (alerts: AlertDoc[]) => void): () => void {
  const q = query(collection(db, ALERTS), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items: AlertDoc[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AlertDoc, 'id'>),
      }));
      cb(items);
    },
    (error) => {
      console.error('listenToAlertHistory error:', error);
      cb([]);
    }
  );
}

export async function getUserAlerts(userId: string): Promise<AlertDoc[]> {
  const q = query(collection(db, ALERTS), where('userId', '==', userId), orderBy('createdAt', 'desc'));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AlertDoc, 'id'>),
  }));
}

export async function voteOnAlert(alertId: string, type: 'up' | 'down') {
  const alertRef = doc(db, ALERTS, alertId);

  await updateDoc(alertRef, {
    upvotes: type === 'up' ? increment(1) : increment(0),
    downvotes: type === 'down' ? increment(1) : increment(0),
  });
}

// Admin actions for web
export async function resolveAlert(alertId: string) {
  const alertRef = doc(db, ALERTS, alertId);
  await updateDoc(alertRef, {
    status: 'resolved',
    resolvedAt: serverTimestamp(),
    resolvedBy: auth.currentUser?.uid ?? null,
  });
}

export async function markAlertFalse(alertId: string) {
  const alertRef = doc(db, ALERTS, alertId);
  await updateDoc(alertRef, {
    status: 'false',
    falseFlaggedAt: serverTimestamp(),
    falseFlaggedBy: auth.currentUser?.uid ?? null,
  });
}

