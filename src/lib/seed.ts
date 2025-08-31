import { createClient } from '@supabase/supabase-js';
import { UserProfile, Product, Coupon } from '@/lib/data';

// Note: This script contains the core logic for seeding the database.
// It is intended to be called from a secure server-side environment (like a Server Action)
// and should not be exposed directly to the client.

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

  // ---- 0. Clean up existing data ----
  const { data: { users: allAuthUsers }, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers();
  if (listUsersError) throw new Error(`Error listing users: ${listUsersError.message}`);
  
  if (allAuthUsers.length > 0) {
    console.log(`Found ${allAuthUsers.length} users in auth. Deleting...`);
    for (const user of allAuthUsers) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }
    console.log("All auth users deleted.");
  } else {
    console.log("No existing auth users to delete.");
  }
  
  // Tables will be empty due to CASCADE on auth.users, but we can be explicit.
  console.log("Clearing public tables (users, products, coupons)...");
  await supabaseAdmin.from('coupons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabaseAdmin.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Public tables cleared.");

  // ---- 1. Seed Users and Profiles ----
  const usersToSeed = [
    {
      email: 'bahman.f.behtash@gmail.com',
      password: 'Bahman123!',
      full_name: 'بهمن بهتاش',
      role: 'manager' as const,
      coupon_limit_per_month: 999,
    },
    {
      email: 'sales_manager@example.com',
      password: 'password',
      full_name: 'مدیر فروش',
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

  const createdUsers = [];
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
    if (!authUser) {
      console.warn(`User object not returned for ${userData.email}. Skipping profile creation.`);
      continue;
    }
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
        await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        throw new Error(`خطا در ایجاد پروفایل برای ${userData.email}: ${profileError.message}`);
    }
    console.log(`Created profile for: ${authUser.email}`);
    createdUsers.push({ ...profileData, id: authUser.id }); // Ensure ID is correctly passed
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
    const salesAgent = createdUsers.find(u => u.role === 'sales');
    if (salesAgent) {
      const couponsToSeed: Omit<Coupon, 'id' | 'created_at' | 'code'>[] = [
        {
          discount_percent: 15,
          status: 'active',
          product_id: createdProducts[0].id,
          user_id: salesAgent.id,
          note: 'برای مشتری ویژه',
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
         {
          discount_percent: 20,
          status: 'used',
          product_id: createdProducts[1].id,
          user_id: salesAgent.id,
          note: 'فروش موفق',
          expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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
