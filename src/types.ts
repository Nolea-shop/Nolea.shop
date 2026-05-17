export interface Recipe {
  id: string;
  title: string;
  description: string;
  price: number; // in cents
  imageUrl: string;
  category: string;
  contentUrl?: string; // only for owner/admin
  createdAt: any;
  isOnline: boolean; // controls visibility in shop
  authorId?: string; // UID of the creator
  authorEmail?: string;
  isUserGenerated?: boolean;
}

export interface CartItem extends Recipe {
  quantity: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'user' | 'admin' | 'creator';
  purchasedRecipeIds: string[];
  stripeAccountId?: string; // for payouts
}
