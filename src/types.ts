export interface Recipe {
  id: string;
  title: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  category: string;
  contentUrl?: string; // only for owner/admin
  createdAt: any;
}

export interface CartItem extends Recipe {
  quantity: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  purchasedRecipeIds: string[];
}
