
import { createClient } from '@supabase/supabase-js';
import { UserProfile, Product, Coupon } from '@/lib/data';

// Note: This script contains the core logic for seeding the database.
// It is intended to be called from a secure server-side environment (like a Server Action)
// and should not be exposed directly to the client.

async function deleteExistingData(supabaseAdmin: any) {
  console.log("Starting data cleanup...");
  
  // 1. Delete all users from auth.users
  const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error(`Error listing users: ${listError.message}`);

  if (authUsers.length > 0) {
      console.log(`Found ${authUsers.length} users in auth. Deleting...`);
      // The CASCADE on the public.users table's foreign key will handle deletions there.
      const deletePromises = authUsers.map(user => supabaseAdmin.auth.admin.deleteUser(user.id));
      await Promise.all(deletePromises);
      console.log("All auth users deleted. Corresponding public.users entries deleted via CASCADE.");
  } else {
      console.log("No existing auth users to delete.");
  }

  // 2. Delete all products
  // Coupons will be deleted by the CASCADE constraint on the products table.
  const { error: productError } = await supabaseAdmin.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (productError) throw new Error(`Error deleting products: ${productError.message}`);
  console.log("All products and related coupons deleted.");

  console.log("Data cleanup finished.");
}

async function createTables(supabaseAdmin: any) {
    console.log("Creating tables and setting RLS policies...");
    
    // Create users table
    await supabaseAdmin.rpc('run_sql', {
        sql: `
        -- Drop existing policies to prevent errors on re-run
        DROP POLICY IF EXISTS "Authenticated users can see all users" ON public.users;
        DROP POLICY IF EXISTS "Managers can insert users" ON public.users;
        DROP POLICY IF EXISTS "Users can update their own profile or managers can update any" ON public.users;

        CREATE TABLE IF NOT EXISTS public.users (
            id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
            full_name VARCHAR(255),
            role VARCHAR(50) DEFAULT 'sales' CHECK (role IN ('sales', 'manager')),
            coupon_limit_per_month INT DEFAULT 10
        );
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Authenticated users can see all users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
        CREATE POLICY "Managers can insert users" ON public.users FOR INSERT WITH CHECK (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
        CREATE POLICY "Users can update their own profile or managers can update any" ON public.users FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager');
        `
    });
    console.log("Users table and policies created or updated.");

    // Create products table
     await supabaseAdmin.rpc('run_sql', {
        sql: `
        -- Drop existing policies to prevent errors on re-run
        DROP POLICY IF EXISTS "Public can view products" ON public.products;
        DROP POLICY IF EXISTS "Managers can manage products" ON public.products;

        CREATE TABLE IF NOT EXISTS public.products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price NUMERIC(10, 2) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
        CREATE POLICY "Managers can manage products" ON public.products FOR ALL USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
        `
    });
    console.log("Products table and policies created or updated.");

    // Create coupons table
    await supabaseAdmin.rpc('run_sql', {
        sql: `
        -- Drop existing policies to prevent errors on re-run
        DROP POLICY IF EXISTS "Public can view coupons by code" ON public.coupons;
        DROP POLICY IF EXISTS "Users can manage their own coupons" ON public.coupons;
        DROP POLICY IF EXISTS "Managers can view all coupons" ON public.coupons;
        DROP POLICY IF EXISTS "Managers can delete coupons" ON public.coupons;
        
        CREATE TABLE IF NOT EXISTS public.coupons (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            code VARCHAR(255) UNIQUE NOT NULL,
            discount_percent INT NOT NULL,
            status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
            product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
            user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
            note TEXT,
            expires_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Public can view coupons by code" ON public.coupons FOR SELECT USING (true);
        CREATE POLICY "Users can manage their own coupons" ON public.coupons FOR ALL USING (auth.uid() = user_id);
        CREATE POLICY "Managers can view all coupons" ON public.coupons FOR SELECT USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
        CREATE POLICY "Managers can delete coupons" ON public.coupons FOR DELETE USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
        `
    });
     console.log("Coupons table and policies created or updated.");
}

export async function seedDatabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are not properly configured.');
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  console.log("Starting database seed...");
  
  await deleteExistingData(supabaseAdmin);
  await createTables(supabaseAdmin);

  // ---- 1. Seed Users and Profiles ----
  const usersToSeed = [
    {
      email: 'bahman.f.behtash@gmail.com',
      password: '123456',
      full_name: 'bahman fallahi',
      role: 'manager' as const,
      coupon_limit_per_month: 999,
    },
    {
      email: 'sales_agent_1@example.com',
      password: 'password',
      full_name: 'نماینده فروش ۱',
      role: 'sales' as const,
      coupon_limit_per_month: 10,
    },
     {
      email: 'sales_agent_2@example.com',
      password: 'password',
      full_name: 'نماینده فروش ۲',
      role: 'sales' as const,
      coupon_limit_per_month: 15,
    },
  ];

  const createdUsers: UserProfile[] = [];
  console.log("Seeding users and profiles...");

  for (const userData of usersToSeed) {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
    });

    if (authError) {
      console.error(`Error creating auth user ${userData.email}:`, authError);
      throw new Error(`خطا در ایجاد کاربر ${userData.email}: ${authError.message}`);
    }
    
    const authUser = authData.user;
    if (!authUser) continue;
    console.log(`Created auth user: ${authUser.email} with ID: ${authUser.id}`);

    const profileData = {
        id: authUser.id,
        full_name: userData.full_name,
        role: userData.role,
        coupon_limit_per_month: userData.coupon_limit_per_month,
    };
  
    const { error: profileError } = await supabaseAdmin.from('users').insert(profileData);

    if (profileError) {
        console.error(`Error creating profile for ${userData.email}:`, profileError);
        await supabaseAdmin.auth.admin.deleteUser(authUser.id); // Rollback auth user
        throw new Error(`خطا در ایجاد پروفایل برای ${userData.email}: ${profileError.message}`);
    }
    console.log(`Created profile for: ${authUser.email}`);
    createdUsers.push(profileData);
  }
  
  // ---- 2. Seed Products ----
  console.log("Seeding products...");
  const productsToSeed: Omit<Product, 'id' | 'created_at'>[] = [
    { name: 'مودم فیبر نوری هواوی', description: 'مودم پرسرعت با پوشش‌دهی عالی', price: 150, is_active: true },
    { name: 'مودم فیبر نوری ZTE', description: 'مودم اقتصادی و باکیفیت', price: 120, is_active: true },
    { name: 'مودم 5G قابل حمل', description: 'اینترنت پرسرعت در هر مکان', price: 250, is_active: false },
  ];
  
  const { data: createdProducts, error: productsError } = await supabaseAdmin
    .from('products')
    .insert(productsToSeed)
    .select();

  if (productsError) throw new Error(`خطا در ایجاد محصولات: ${productsError.message}`);
  console.log(`${createdProducts.length} products seeded.`);

  // ---- 3. Seed Coupons ----
  console.log("Seeding coupons...");
  if (createdProducts && createdProducts.length > 0 && createdUsers.length > 0) {
    const salesAgent1 = createdUsers.find(u => u.full_name === 'نماینده فروش ۱');
    const salesAgent2 = createdUsers.find(u => u.full_name === 'نماینده فروش ۲');
    
    if (salesAgent1 && salesAgent2) {
      const couponsToSeed: Omit<Coupon, 'id' | 'created_at' | 'code'>[] = [
        {
          discount_percent: 15,
          status: 'active',
          product_id: createdProducts[0].id,
          user_id: salesAgent1.id,
          note: 'برای مشتری ویژه',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
         {
          discount_percent: 20,
          status: 'used',
          product_id: createdProducts[1].id,
          user_id: salesAgent2.id,
          note: 'فروش موفق',
          expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          discount_percent: 10,
          status: 'expired',
          product_id: createdProducts[0].id,
          user_id: salesAgent1.id,
          note: 'منقضی شده',
          expires_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      for (const couponData of couponsToSeed) {
         const productName = createdProducts.find(p=>p.id === couponData.product_id)?.name?.split(' ')[0].toUpperCase() || 'COUPON';
         const code = `${productName}-OFF${couponData.discount_percent}-${Math.floor(1000 + Math.random() * 9000)}`;

         const { error: couponError } = await supabaseAdmin.from('coupons').insert({ ...couponData, code });
         if (couponError) {
              console.error(`Error creating coupon:`, couponError);
              throw new Error(`خطا در ایجاد کوپن: ${couponError.message}`);
         }
      }
      console.log(`${couponsToSeed.length} coupons seeded.`);
    }
  }
  console.log("Database seed completed successfully.");
  return { success: true, message: 'پایگاه داده با موفقیت با داده‌های اولیه پر شد. کاربران، محصولات و کوپن‌ها ایجاد شدند.' };
}
