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

export type AlertDoc = {
  id: string;
  userId: string;
  type: AlertType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  createdAt: Timestamp | null;
  expiresAt?: Timestamp | null;
  upvotes?: number;
  downvotes?: number;
};

const ALERTS = 'alerts';

export async function createAlert(params: {
  type: AlertType;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  ttlMinutes?: number;
}) {
  const { type, title, description, latitude, longitude, ttlMinutes = 120 } = params;

  const createdAt = serverTimestamp();
  const expiresAt = ttlMinutes > 0 ? Timestamp.fromMillis(Date.now() + ttlMinutes * 60 * 1000) : null;

  const ref = await addDoc(collection(db, ALERTS), {
    userId: auth.currentUser?.uid ?? 'anonymous',
    type,
    title,
    description,
    latitude,
    longitude,
    createdAt,
    expiresAt,
    upvotes: 0,
    downvotes: 0,
  });

  return ref.id;
}

export function listenToAllAlerts(cb: (alerts: AlertDoc[]) => void): () => void {
  return onSnapshot(query(collection(db, ALERTS), orderBy('createdAt', 'desc')), (snap) => {
    const now = Timestamp.now();
    const items: AlertDoc[] = snap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AlertDoc, 'id'>),
      }))
      .filter((alert) => !alert.expiresAt || alert.expiresAt > now);
    cb(items);
  });
}

export function listenToAlertHistory(cb: (alerts: AlertDoc[]) => void): () => void {
  const q = query(collection(db, ALERTS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: AlertDoc[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AlertDoc, 'id'>),
    }));
    cb(items);
  });
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

