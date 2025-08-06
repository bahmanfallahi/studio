export type User = {
  id: number;
  full_name: string;
  username: string;
  password_hash: string;
  role: 'sales' | 'manager';
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type Coupon = {
  id: number;
  code: string;
  discount_percent: number;
  status: 'active' | 'expired' | 'used';
  product_id: number;
  user_id: number;
  note: string;
  expires_at: string;
  created_at: string;
};

export const users: User[] = [
  {
    id: 1,
    full_name: 'Alex Johnson',
    username: 'sales_agent_1',
    password_hash: 'password',
    role: 'sales',
    created_at: '2023-01-15T09:30:00Z',
  },
  {
    id: 2,
    full_name: 'Maria Garcia',
    username: 'sales_agent_2',
    password_hash: 'password',
    role: 'sales',
    created_at: '2023-01-20T11:00:00Z',
  },
  {
    id: 3,
    full_name: 'Jane Doe',
    username: 'sales_manager',
    password_hash: 'password',
    role: 'manager',
    created_at: '2023-01-10T08:00:00Z',
  },
];

export const products: Product[] = [
  {
    id: 1,
    name: 'Modem W5',
    description: 'High-speed fiber optic modem, ideal for residential use.',
    price: 99.99,
    is_active: true,
    created_at: '2023-01-01T12:00:00Z',
  },
  {
    id: 2,
    name: 'Modem X10',
    description: 'Enterprise-grade fiber optic modem for small businesses.',
    price: 199.99,
    is_active: true,
    created_at: '2023-01-05T14:20:00Z',
  },
  {
    id: 3,
    name: 'Modem G3',
    description: 'Legacy modem, no longer in production.',
    price: 49.99,
    is_active: false,
    created_at: '2022-05-01T10:00:00Z',
  },
];

export const coupons: Coupon[] = [
  {
    id: 1,
    code: 'W5-OFF20-1234',
    discount_percent: 20,
    status: 'used',
    product_id: 1,
    user_id: 1,
    note: 'For Mr. Smith',
    expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    code: 'X10-OFF15-5678',
    discount_percent: 15,
    status: 'active',
    product_id: 2,
    user_id: 1,
    note: 'For ACME Corp',
    expires_at: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    code: 'W5-OFF25-9101',
    discount_percent: 25,
    status: 'expired',
    product_id: 1,
    user_id: 2,
    note: '',
    expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    code: 'X10-OFF10-1121',
    discount_percent: 10,
    status: 'active',
    product_id: 2,
    user_id: 2,
    note: 'For Tech Solutions Ltd.',
    expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
  },
];
