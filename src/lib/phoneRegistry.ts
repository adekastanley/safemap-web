import { db, auth } from '@/lib/firebase';
import { addDoc, collection, doc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

export type RegisteredPhone = {
  id: string;
  userId: string; // admin who registered this phone
  name: string;
  phoneNumber: string;
  homeLocation?: { latitude: number; longitude: number; address?: string };
  categories?: string[];
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
};

const REGISTERED_USERS = 'registered_users';

export async function registerPhone(params: {
  name: string;
  phoneNumber: string;
  homeLocation?: { latitude: number; longitude: number; address?: string };
  categories?: string[];
}) {
  const { name, phoneNumber, homeLocation, categories } = params;
  const userId = auth.currentUser?.uid || 'admin';

  const createdAt = serverTimestamp();

  const ref = await addDoc(collection(db, REGISTERED_USERS), {
    userId,
    name,
    phoneNumber,
    homeLocation: homeLocation || null,
    categories: categories || [],
    isActive: true,
    createdAt,
    updatedAt: createdAt,
  });

  return ref.id;
}

export function listenToMyRegisteredPhones(cb: (phones: RegisteredPhone[]) => void) {
  const userId = auth.currentUser?.uid;
  const q = query(collection(db, REGISTERED_USERS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const items: RegisteredPhone[] = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<RegisteredPhone, 'id'>) }))
      .filter((p) => !userId || p.userId === userId);
    cb(items);
  });
}

export async function updatePhone(id: string, updates: Partial<RegisteredPhone>) {
  await updateDoc(doc(db, REGISTERED_USERS, id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deactivatePhone(id: string) {
  await updatePhone(id, { isActive: false });
}

