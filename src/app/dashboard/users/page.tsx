'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusCircle, MoreHorizontal, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/auth-provider';
import { UserProfile } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createClient } from '@/lib/supabase';
import { type User } from '@supabase/supabase-js';

type EditableUser = Partial<UserProfile> & { email?: string, password?: string };
type UserWithAuth = UserProfile & { user?: User };

function UserForm({
  user: initialUser,
  onSave,
  onClose,
}: {
  user: EditableUser | null;
  onSave: (user: EditableUser) => Promise<boolean>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<EditableUser>(
    initialUser || { full_name: '', email: '', role: 'sales', coupon_limit_per_month: 10 }
  );
  const [isSaving, setIsSaving] = useState(false);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
  };

  const handleRoleChange = (value: 'sales' | 'manager') => {
    setFormData((prev) => ({...prev, role: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
    if(success) onClose();
  };
  
  if (!initialUser) return null;

  return (
    <Dialog open={!!initialUser} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">{initialUser.id ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</DialogTitle>
          <DialogDescription>
            {initialUser.id ? 'جزئیات و نقش کاربر را به‌روز کنید.' : 'یک نماینده فروش یا مدیر جدید ایجاد کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">نام کامل</Label>
            <Input id="full_name" name="full_name" value={formData.full_name || ''} onChange={handleChange} required/>
          </div>
          <div>
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} required disabled={!!initialUser.id} />
          </div>
           <div>
            <Label htmlFor="password">رمز عبور</Label>
            <Input id="password" name="password" type="password" placeholder={initialUser.id ? 'برای عدم تغییر، خالی بگذارید' : ''} onChange={handleChange} required={!initialUser.id} />
          </div>
          <div>
            <Label htmlFor="role">نقش</Label>
            <Select onValueChange={handleRoleChange} defaultValue={formData.role}>
              <SelectTrigger><SelectValue placeholder="یک نقش انتخاب کنید" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">نماینده فروش</SelectItem>
                <SelectItem value="manager">مدیر فروش</SelectItem>
              </SelectContent>
            </Select>
          </div>
           <div>
            <Label htmlFor="coupon_limit_per_month">سقف ماهانه کوپن</Label>
            <Input id="coupon_limit_per_month" name="coupon_limit_per_month" type="number" value={formData.coupon_limit_per_month || 10} onChange={handleChange} required/>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>انصراف</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'در حال ذخیره...' : 'ذخیره کاربر' }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { profile: currentUserProfile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const [users, setUsers] = useState<UserWithAuth[]>([]);
  const [editingUser, setEditingUser] = useState<EditableUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    // This needs to be an admin call to get all users.
    // For now we assume RLS is set up for managers to read profiles.
    // We will simulate joining with auth.users data.
    const { data: profiles, error } = await supabase.from('profiles').select('*');

    if (error) {
        toast({ variant: 'destructive', title: 'خطا در دریافت کاربران', description: error.message });
        console.error("Error fetching users: ", error);
        setUsers([]);
    } else {
        // This is a client-side simulation. For production, a server-side fetch would be better.
        const usersWithAuthData = profiles.map(profile => ({
            ...profile,
            user: { email: 'ایمیل در دسترس نیست', created_at: 'تاریخ در دسترس نیست'} // Placeholder
        }));
        setUsers(usersWithAuthData as any);
    }
    setLoading(false);
  }, [supabase, toast]);

  useEffect(() => {
    if (currentUserProfile?.role === 'manager') {
      fetchUsers();
    }
  }, [fetchUsers, currentUserProfile]);
  
  const handleSave = async (userData: EditableUser) => {
    // Creating/updating users requires admin privileges. 
    // This should be moved to a server action / API route with admin client.
    // The client-side implementation is for demonstration purposes.
    toast({ variant: 'destructive', title: "عملیات غیرمجاز", description: "ایجاد یا ویرایش مستقیم کاربران از کلاینت امکان‌پذیر نیست و نیازمند یک سرور اکشن امن است." });
    return false;
  };

  const handleDelete = async (userId: string) => {
     if (userId === currentUserProfile?.id) {
        toast({ variant: 'destructive', title: 'عملیات غیرمجاز', description: "شما نمی‌توانید حساب کاربری خود را حذف کنید." });
        return;
    }
    // Deleting users requires admin privileges.
    toast({ variant: 'destructive', title: "عملیات غیرمجاز", description: "حذف مستقیم کاربران از کلاینت امکان‌پذیر نیست و نیازمند یک سرور اکشن امن است." });
  };

  if (currentUserProfile?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">دسترسی غیرمجاز</h1>
        <p className="text-muted-foreground">شما اجازه مشاهده این صفحه را ندارید.</p>
      </div>
    );
  }

  return (
    <>
      {editingUser && (
        <UserForm
          user={editingUser}
          onSave={handleSave}
          onClose={() => setEditingUser(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">کاربران</h1>
          <p className="text-muted-foreground">تیم نمایندگان فروش و مدیران خود را مدیریت کنید. (عملیات نوشتن غیرفعال است)</p>
        </div>
        <Button onClick={() => setEditingUser({ full_name: '', email: '', role: 'sales', coupon_limit_per_month: 10 })}>
          <PlusCircle className="ml-2 h-4 w-4" /> افزودن کاربر
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
             <div className="flex items-center justify-center h-48"><LoaderCircle className="h-10 w-10 animate-spin" /></div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام کامل</TableHead>
                <TableHead className="text-right">ایمیل</TableHead>
                <TableHead className="text-right">نقش</TableHead>
                <TableHead className="text-right">سقف کوپن</TableHead>
                <TableHead className="text-right">تاریخ ایجاد</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-right">{user.full_name}</TableCell>
                  <TableCell className="text-right">{user.user?.email || 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                      {user.role === 'manager' ? 'مدیر' : 'نماینده فروش'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{user.role === 'sales' ? user.coupon_limit_per_month : 'N/A'}</TableCell>
                   <TableCell className="text-right">{user.user?.created_at && user.user.created_at !== 'تاریخ در دسترس نیست' ? new Date(user.user.created_at).toLocaleDateString('fa-IR') : 'N/A'}</TableCell>
                  <TableCell className="text-center">
                    <AlertDialog>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">باز کردن منو</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingUser({ ...user, email: user.user?.email })}>ویرایش</DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600" disabled={user.id === currentUserProfile?.id}>حذف</DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>آیا کاملاً مطمئن هستید؟</AlertDialogTitle>
                            <AlertDialogDescription>این عملیات قابل بازگشت نیست. این کار حساب کاربری و تمام داده‌های مرتبط با آن را برای همیشه حذف می‌کند.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
