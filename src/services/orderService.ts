import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ORDERS_COLLECTION = 'orders';

export async function getAllOrders() {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getUserOrders(userId: string) {
  const q = query(
    collection(db, ORDERS_COLLECTION), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
