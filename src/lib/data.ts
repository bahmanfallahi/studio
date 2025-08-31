// This file defines the TypeScript types for the application data.
// It is used across the application to ensure type safety.

export type UserProfile = {
  id: string; // Corresponds to Supabase Auth user ID
  full_name: string;
  role: 'sales' | 'manager';
  coupon_limit_per_month: number;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  status: 'active' | 'expired' | 'used';
  product_id: string;
  user_id: string; // This is the UUID of the user from auth.users
  note: string;
  expires_at: string;
  created_at: string;
  // Joined data from other tables
  products?: { name: string };
  users?: { full_name: string };
};
