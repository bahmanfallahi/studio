
import { createClient } from '@supabase/supabase-js';
import { UserProfile, Product, Coupon } from '@/lib/data';

// Note: This script contains the core logic for seeding the database.
// It is intended to be called from a secure server-side environment (like a Server Action)
// and should not be exposed directly to the client.

async function deleteExistingData(supabaseAdmin: any) {
  console.log("Starting data cleanup...");
  
  // Delete all users from auth.users which will cascade to public.users
  const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) throw new Error(`Error listing users: ${listError.message}`);

  if (authUsers.length > 0) {
      console.log(`Found ${authUsers.length} users in auth. Deleting...`);
      for (const user of authUsers) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
      console.log("All auth users deleted. Corresponding public.users entries should be deleted via CASCADE.");
  } else {
      console.log("No existing auth users to delete.");
  }
  
  // The CASCADE delete on auth.users should handle public.users.
  // We also delete all products, which will cascade to coupons.
  const { error: productError } = await supabaseAdmin.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (productError) console.error(`Could not delete products (this is okay if tables don't exist yet): ${productError.message}`);

  // Also explicitly delete users and coupons tables to be safe, in case cascade didn't work.
  const { error: usersError } = await supabaseAdmin.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
   if (usersError) console.error(`Could not delete users (this is okay if tables don't exist yet): ${usersError.message}`);
  const { error: couponsError } = await supabaseAdmin.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (couponsError) console.error(`Could not delete coupons (this is okay if tables don't exist yet): ${couponsError.message}`);


  console.log("Data cleanup finished.");
}

async function setupTables(supabaseAdmin: any) {
    console.log("Setting up tables, RLS policies, and triggers...");

    const schemaSQL = `
      -- Create users table
      CREATE TABLE IF NOT EXISTS public.users (
          id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
          full_name VARCHAR(255),
          role VARCHAR(50) DEFAULT 'sales' CHECK (role IN ('sales', 'manager')),
          coupon_limit_per_month INT DEFAULT 10
      );
      ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
      
      -- Create products table
      CREATE TABLE IF NOT EXISTS public.products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price NUMERIC(10, 2) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
      
      -- Create coupons table
      CREATE TABLE IF NOT EXISTS public.coupons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(255) UNIQUE NOT NULL,
          discount_percent INT NOT NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used')),
          product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
          user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
          note TEXT,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

      -- Add the business logic constraint for coupon limits
      ALTER TABLE public.users DROP CONSTRAINT IF EXISTS role_based_coupon_limit;
      ALTER TABLE public.users ADD CONSTRAINT role_based_coupon_limit CHECK (
        (role = 'manager' AND coupon_limit_per_month = 999) OR
        (role = 'sales' AND coupon_limit_per_month >= 0)
      );

      -- Drop existing policies before creating new ones to avoid errors on re-runs
      DROP POLICY IF EXISTS "Authenticated users can see all users" ON public.users;
      DROP POLICY IF EXISTS "Managers can insert users" ON public.users;
      DROP POLICY IF EXISTS "Users can update their own profile or managers can update any" ON public.users;
      DROP POLICY IF EXISTS "Managers can delete any user" ON public.users;
      
      DROP POLICY IF EXISTS "Public can view products" ON public.products;
      DROP POLICY IF EXISTS "Managers can manage products" ON public.products;

      DROP POLICY IF EXISTS "Public can view coupons by code" ON public.coupons;
      DROP POLICY IF EXISTS "Users can view their own coupons" ON public.coupons;
      DROP POLICY IF EXISTS "Users can create coupons" ON public.coupons;
      DROP POLICY IF EXISTS "Managers can view all coupons" ON public.coupons;
      DROP POLICY IF EXISTS "Managers can manage coupons" ON public.coupons;


      -- USERS RLS
      CREATE POLICY "Authenticated users can see all users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
      CREATE POLICY "Managers can insert users" ON public.users FOR INSERT WITH CHECK (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
      CREATE POLICY "Users can update their own profile or managers can update any" ON public.users FOR UPDATE USING (auth.uid() = id OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'manager');
      CREATE POLICY "Managers can delete any user" ON public.users FOR DELETE USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
      
      -- PRODUCTS RLS
      CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);
      CREATE POLICY "Managers can manage products" ON public.products FOR ALL USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));

      -- COUPONS RLS
      CREATE POLICY "Public can view coupons by code" ON public.coupons FOR SELECT USING (true);
      CREATE POLICY "Users can view their own coupons" ON public.coupons FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can create coupons" ON public.coupons FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Managers can view all coupons" ON public.coupons FOR SELECT USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));
      CREATE POLICY "Managers can manage coupons" ON public.coupons FOR ALL USING (((SELECT role FROM public.users WHERE id = auth.uid()) = 'manager'));

      -- Function to create a user profile row
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER SET SEARCH_PATH = public
      AS $$
      BEGIN
        INSERT INTO public.users (id, full_name, role)
        VALUES (new.id, new.raw_user_meta_data->>'full_name', 'sales'); -- Default role is 'sales'
        RETURN NEW;
      END;
      $$;

      -- Trigger to call the function on new user signup
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; -- Ensures no duplicates
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
    `;
    
    const { error: schemaError } = await supabaseAdmin.rpc('exec', { sql: schemaSQL });
    if (schemaError) throw new Error(`Table and trigger setup failed: ${schemaError.message}`);

    console.log("Tables, policies, and triggers created or updated successfully.");
}

// A helper function to execute raw SQL, as Supabase client doesn't directly support multi-statement queries.
async function createExecSqlFunction(supabaseAdmin: any) {
  // Check if the function exists by trying to call it.
  const { error } = await supabaseAdmin.rpc('exec', { sql: 'SELECT 1;' }).catch(e => ({ data: null, error: e }));

  // If the function doesn't exist, create it.
  if (error && (error.code === '42883' || error.message.includes('function exec(sql => text) does not exist'))) { // "function does not exist"
    console.log('exec() function not found. Creating it...');
    const { error: createFnError } = await supabaseAdmin.sql(`
        CREATE OR REPLACE FUNCTION exec(sql text) RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql;
      `);

    if (createFnError) {
      // It might be a permissions error, try the old way as a fallback
      try {
        await supabaseAdmin.rpc('run_sql', { sql: 'CREATE OR REPLACE FUNCTION exec(sql text) ...' }); // simplified
      } catch (fallbackError) {
          throw new Error(`Failed to create exec() function: ${createFnError.message}`);
      }
    }
    console.log('exec() function created.');
  } else if (error) {
    // For other errors, just log them
    console.error('Error checking for exec() function:', error.message);
  } else {
    // If no error, the function already exists.
    console.log('exec() function already exists.');
  }
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
  
  await createExecSqlFunction(supabaseAdmin);
  
  await deleteExistingData(supabaseAdmin);
  await setupTables(supabaseAdmin);

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
    // We create the auth user first
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
    });

    if (authError) {
      console.error(`Error creating auth user ${userData.email}:`, authError);
      throw new Error(`خطا در ایجاد کاربر ${userData.email}: ${authError.message}`);
    }
    if (!user) {
        console.error(`User object was null for ${userData.email}`);
        continue;
    };
    console.log(`Created auth user: ${user.email} with ID: ${user.id}`);
    
    // The trigger will automatically create the public.users row with default values.
    // We only need to UPDATE it with the correct role and limit.
    const profileData = {
        full_name: userData.full_name,
        role: userData.role,
        coupon_limit_per_month: userData.coupon_limit_per_month,
    };
  
    const { error: profileError } = await supabaseAdmin.from('users').update(profileData).eq('id', user.id);

    if (profileError) {
        console.error(`Error updating profile for ${userData.email}:`, profileError);
        // If profile update fails, we should still consider the user created. The trigger handled the basic insert.
    }
    console.log(`Updated profile for: ${user.email}`);
    createdUsers.push({ id: user.id, ...profileData });
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
