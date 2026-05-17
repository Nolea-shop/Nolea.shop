import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, Timestamp, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe } from '../types';

const RECIPES_COLLECTION = 'recipes';

// Helper: Timeout promise
const timeout = (ms: number) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`Timeout nach ${ms}ms`)), ms)
);

export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const q = query(
      collection(db, RECIPES_COLLECTION), 
      where('isOnline', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, RECIPES_COLLECTION);
    return [];
  }
}

export async function getAdminRecipes(): Promise<Recipe[]> {
  try {
    const q = query(collection(db, RECIPES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, RECIPES_COLLECTION);
    return [];
  }
}

export async function getCreatorRecipes(userId: string): Promise<Recipe[]> {
  try {
    const q = query(
      collection(db, RECIPES_COLLECTION), 
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${RECIPES_COLLECTION}?authorId=${userId}`);
    return [];
  }
}

export async function createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>) {
  try {
    // Race: addDoc vs. 10-Second timeout to prevent hanging
    const result = await Promise.race([
      addDoc(collection(db, RECIPES_COLLECTION), {
        ...recipe,
        createdAt: serverTimestamp()
      }),
      timeout(10000)
    ]);
    return result;
  } catch (error: any) {
    console.error('Create recipe error:', error?.message, error?.code);
    // Rethrow so UI can catch it
    const err = new Error(error?.message || 'Fehler beim Speichern. Prüfe Verbindung und Berechtigungen.');
    (err as any).code = error?.code;
    throw err;
  }
}

export async function deleteRecipe(id: string) {
  try {
    return await deleteDoc(doc(db, RECIPES_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${RECIPES_COLLECTION}/${id}`);
  }
}

export async function updateRecipe(id: string, recipe: Partial<Recipe>) {
  try {
    return await updateDoc(doc(db, RECIPES_COLLECTION, id), recipe);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RECIPES_COLLECTION}/${id}`);
  }
}

export async function toggleRecipeOnline(id: string, currentStatus: boolean) {
  try {
    return await updateDoc(doc(db, RECIPES_COLLECTION, id), { isOnline: !currentStatus });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${RECIPES_COLLECTION}/${id}`);
  }
}
