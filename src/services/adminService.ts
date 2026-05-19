import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { auth } from '../lib/firebase';

const USERS_COLLECTION = 'users';

// Stellt sicher, dass der aktuelle User als Admin markiert ist
export async function ensureAdminRole() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Kein User eingeloggt');
  }

  const userRef = doc(db, USERS_COLLECTION, user.uid);
  
  // Prüfe ob User existiert
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) {
    // Erstelle User mit admin-Rolle
    await setDoc(userRef, {
      email: user.email,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Admin-Rolle für User gesetzt:', user.email);
  }
  
  return snap.exists() ? snap.data() : { role: 'admin' };
}

// Admin-Rechte initialisieren
export async function initAdminIfNeeded() {
  try {
    await ensureAdminRole();
  } catch (error) {
    console.warn('Kann Admin-Rolle nicht setzen:', error);
  }
}
