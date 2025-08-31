import { createClient } from '@supabase/supabase-js';
import { UserProfile, Product, Coupon } from '@/lib/data';

// Note: This script is intended for development and seeding purposes.
// Do not expose the service_role key in client-side code in production.

export async function seedDatabase() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { success: false, message: 'متغیرهای محیطی Supabase به درستی تنظیم نشده‌اند.' };
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // ---- 1. Seed Users and Profiles ----
    const usersToSeed: (Omit<UserProfile, 'id'> & { email: string; password_hash: string })[] = [
      {
        email: 'bahman.f.behtash@gmail.com',
        password_hash: 'Bahman123!',
        full_name: 'بهمن بهتاش',
        role: 'manager',
        coupon_limit_per_month: 999,
      },
      {
        email: 'sales_manager@example.com',
        password_hash: 'password',
        full_name: 'مدیر فروش',
        role: 'manager',
        coupon_limit_per_month: 999,
      },
      {
        email: 'sales_agent_1@example.com',
        password_hash: 'password',
        full_name: 'نماینده فروش ۱',
        role: 'sales',
        coupon_limit_per_month: 10,
      },
       {
        email: 'sales_agent_2@example.com',
        password_hash: 'password',
        full_name: 'نماینده فروش ۲',
        role: 'sales',
        coupon_limit_per_month: 15,
      },
    ];

    const createdUsers = [];
    for (const userData of usersToSeed) {
        // Check if user already exists
        const { data: { users: existingUsers } } = await supabaseAdmin.auth.admin.listUsers({ email: userData.email } as any);
        let authUser;

        if (existingUsers && existingUsers.length > 0) {
            authUser = existingUsers[0];
        } else {
             const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: userData.email,
                password: userData.password_hash,
                email_confirm: true, // Auto-confirm email for simplicity
            });
            if (authError) throw new Error(`خطا در ایجاد کاربر ${userData.email}: ${authError.message}`);
            authUser = data.user;
        }

       if (!authUser) continue;

      const profileData: UserProfile = {
        id: authUser.id,
        full_name: userData.full_name,
        role: userData.role,
        coupon_limit_per_month: userData.coupon_limit_per_month,
      };

      const { error: profileError } = await supabaseAdmin.from('profiles').upsert(profileData);
      if (profileError) throw new Error(`خطا در ایجاد پروفایل برای ${userData.email}: ${profileError.message}`);
      
      createdUsers.push(profileData);
    }
    
    // ---- 2. Seed Products ----
    const productsToSeed: Omit<Product, 'id' | 'created_at'>[] = [
      { name: 'مودم فیبر نوری هواوی', description: 'مودم پرسرعت با پوشش‌دهی عالی', price: 150, is_active: true },
      { name: 'مودم فیبر نوری ZTE', description: 'مودم اقتصادی و باکیفیت', price: 120, is_active: true },
      { name: 'مودم 5G قابل حمل', description: 'اینترنت پرسرعت در هر مکان', price: 250, is_active: false },
    ];
    
    const { data: createdProducts, error: productsError } = await supabaseAdmin
      .from('products')
      .upsert(productsToSeed, { onConflict: 'name', ignoreDuplicates: true })
      .select();

    if (productsError) throw new Error(`خطا در ایجاد محصولات: ${productsError.message}`);

    // ---- 3. Seed Coupons ----
    if (createdProducts && createdProducts.length > 0) {
      const salesAgent = createdUsers.find(u => u.role === 'sales');
      if (salesAgent) {
        const couponsToSeed: Omit<Coupon, 'id' | 'created_at' | 'code'>[] = [
          {
            discount_percent: 15,
            status: 'active',
            product_id: createdProducts[0].id,
            user_id: salesAgent.id,
            note: 'برای مشتری ویژه',
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          },
           {
            discount_percent: 20,
            status: 'used',
            product_id: createdProducts[1].id,
            user_id: salesAgent.id,
            note: 'فروش موفق',
            expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          },
        ];

        for (const couponData of couponsToSeed) {
           const productName = createdProducts.find(p=>p.id === couponData.product_id)?.name?.split(' ')[0].toUpperCase() || 'COUPON';
           const code = `${productName}-OFF${couponData.discount_percent}-${Math.floor(1000 + Math.random() * 9000)}`;

           const { error: couponError } = await supabaseAdmin.from('coupons').insert({ ...couponData, code });
           if (couponError && couponError.code !== '23505') { // Ignore duplicate errors
                throw new Error(`خطا در ایجاد کوپن: ${couponError.message}`);
           }
        }
      }
    }

    return { success: true, message: 'پایگاه داده با موفقیت با داده‌های اولیه پر شد. کاربران، محصولات و کوپن‌ها ایجاد شدند.' };
  } catch (error: any) {
    console.error("Database seeding failed:", error);
    return { success: false, message: error.message };
  }
}
