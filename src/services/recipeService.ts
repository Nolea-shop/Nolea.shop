import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe } from '../types';

const RECIPES_COLLECTION = 'recipes';

export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const q = query(collection(db, RECIPES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Recipe[];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, RECIPES_COLLECTION);
    return []; // Never reached due to throw in handleFirestoreError
  }
}

export async function createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>) {
  try {
    return await addDoc(collection(db, RECIPES_COLLECTION), {
      ...recipe,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, RECIPES_COLLECTION);
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
