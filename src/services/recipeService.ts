import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Recipe } from '../types';

const RECIPES_COLLECTION = 'recipes';

export async function getAllRecipes(): Promise<Recipe[]> {
  const q = query(collection(db, RECIPES_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Recipe[];
}

export async function createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt'>) {
  return await addDoc(collection(db, RECIPES_COLLECTION), {
    ...recipe,
    createdAt: serverTimestamp()
  });
}

export async function deleteRecipe(id: string) {
  return await deleteDoc(doc(db, RECIPES_COLLECTION, id));
}

export async function updateRecipe(id: string, recipe: Partial<Recipe>) {
  return await updateDoc(doc(db, RECIPES_COLLECTION, id), recipe);
}
