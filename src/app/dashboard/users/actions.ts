'use server';

import { createClient } from '@/lib/supabase/server';
import { UserProfile } from '@/lib/data';
import { revalidatePath } from 'next/cache';

// This type joins the profile with the auth user data
export type UserWithAuth = UserProfile & { 
    email?: string, 
    created_at?: string,
};


export async function fetchUsers(): Promise<{ data: UserWithAuth[] | null, error: string | null }> {
    const supabase = createClient();

    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
        console.error("Error fetching auth users:", authError);
        return { data: null, error: authError.message };
    }

    const { data: profiles, error: profileError } = await supabase.from('users').select('*');
    if (profileError) {
        console.error("Error fetching user profiles:", profileError);
        return { data: null, error: profileError.message };
    }

    const combined = authUsers.map(authUser => {
        const profile = profiles.find(p => p.id === authUser.id);
        return {
            ...profile,
            id: authUser.id,
            email: authUser.email,
            created_at: authUser.created_at,
            full_name: profile?.full_name || 'نام یافت نشد',
            role: profile?.role || 'sales',
            coupon_limit_per_month: profile?.coupon_limit_per_month || 0,
        }
    });

    return { data: combined, error: null };
}

export async function saveUser(userData: Partial<UserWithAuth>, password?: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { id, full_name, email, role, coupon_limit_per_month } = userData;
    
    // UPDATE
    if (id) {
        // Update auth user if password is provided
        if (password) {
            const { error: authError } = await supabase.auth.admin.updateUserById(id, { password });
            if (authError) return { success: false, error: authError.message };
        }
        
        // Update public user profile
        const { error: profileError } = await supabase.from('users')
            .update({ full_name, role, coupon_limit_per_month })
            .eq('id', id);

        if (profileError) return { success: false, error: profileError.message };
    
    // CREATE
    } else {
        if (!email || !password) {
            return { success: false, error: 'ایمیل و رمز عبور برای کاربر جدید الزامی است.' };
        }
        
        // Create auth user
        const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm user
        });

        if (authError) return { success: false, error: authError.message };
        if (!user) return { success: false, error: 'کاربر ایجاد نشد.' };

        // Create public user profile
        const { error: profileError } = await supabase.from('users').insert({
            id: user.id,
            full_name,
            role,
            coupon_limit_per_month,
        });

        if (profileError) {
            // Rollback auth user creation
            await supabase.auth.admin.deleteUser(user.id);
            return { success: false, error: profileError.message };
        }
    }
    
    revalidatePath('/dashboard/users');
    return { success: true };
}


export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    
    // The CASCADE constraint on the public.users table will automatically delete the profile.
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
        console.error("Error deleting user:", error);
        return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/users');
    return { success: true };
}
