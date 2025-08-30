'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, MoreHorizontal, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
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
import { User } from '@/lib/data';
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
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';


function UserForm({
  user,
  onSave,
  onClose,
}: {
  user: Partial<User> | null;
  onSave: (user: Partial<User>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<User>>(
    user || { full_name: '', username: '', role: 'sales', password_hash: '', coupon_limit_per_month: 10 }
  );
  const [isSaving, setIsSaving] = useState(false);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormData((prev) => ({ ...prev, [name]: isNumber ? parseInt(value, 10) : value }));
  };

  const handleRoleChange = (value: 'sales' | 'manager') => {
    setFormData((prev) => ({...prev, role: value}));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
    if(success) {
      onClose();
    }
  };
  
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">{user.id ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}</DialogTitle>
          <DialogDescription>
            {user.id ? 'جزئیات و نقش کاربر را به‌روز کنید.' : 'یک نماینده فروش یا مدیر جدید ایجاد کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">نام کامل</Label>
            <Input id="full_name" name="full_name" value={formData.full_name || ''} onChange={handleChange} required/>
          </div>
          <div>
            <Label htmlFor="username">نام کاربری (ایمیل)</Label>
            <Input id="username" name="username" type="email" value={formData.username || ''} onChange={handleChange} required/>
          </div>
           <div>
            <Label htmlFor="password_hash">رمز عبور</Label>
            <Input id="password_hash" name="password_hash" type="password" placeholder={user.id ? 'برای عدم تغییر، خالی بگذارید' : ''} onChange={handleChange} required={!user.id} />
          </div>
          <div>
            <Label htmlFor="role">نقش</Label>
            <Select onValueChange={handleRoleChange} defaultValue={formData.role}>
              <SelectTrigger>
                <SelectValue placeholder="یک نقش انتخاب کنید" />
              </SelectTrigger>
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
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersCollection = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setUsers(usersList.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'خطا در دریافت کاربران',
                description: 'امکان بارگذاری کاربران از پایگاه داده وجود نداشت.',
            });
            console.error("Error fetching users: ", error);
        }
        setLoading(false);
    };

    fetchUsers();
  }, [toast]);
  
  const handleSave = async (userData: Partial<User>) => {
    try {
        if (userData.id) {
         // Edit
         const userRef = doc(db, "users", userData.id);
         // Don't update password if it's not provided
         const dataToSave: Partial<User> = { ...userData };
         if (!userData.password_hash) {
            const existingUser = users.find(u => u.id === userData.id);
            dataToSave.password_hash = existingUser?.password_hash;
         }
         await setDoc(userRef, dataToSave, { merge: true });
         setUsers(users.map(u => u.id === userData.id ? { ...u, ...dataToSave } as User : u));
         toast({ title: 'کاربر به‌روز شد', description: `پروفایل ${userData.full_name} با موفقیت به‌روزرسانی شد.` });
       } else {
         // Add
         const newUserData: Omit<User, 'id'> = {
           full_name: userData.full_name!,
           username: userData.username!,
           role: userData.role!,
           password_hash: userData.password_hash!,
           coupon_limit_per_month: userData.coupon_limit_per_month || 10,
           created_at: new Date().toISOString(),
         };
         const docRef = await addDoc(collection(db, "users"), newUserData);
         const newUser: User = { ...newUserData, id: docRef.id };
         setUsers([newUser, ...users]);
         toast({ title: 'کاربر اضافه شد', description: `${newUser.full_name} به سیستم اضافه شد.` });
       }
       setEditingUser(null);
       return true;
    } catch (error) {
        console.error("Error saving user: ", error);
        toast({ variant: 'destructive', title: "ذخیره ناموفق", description: "امکان ذخیره کاربر وجود نداشت." });
        return false;
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
        toast({ variant: 'destructive', title: 'عملیات غیرمجاز', description: "شما نمی‌توانید حساب کاربری خود را حذف کنید." });
        return;
    }
    try {
        await deleteDoc(doc(db, "users", userId));
        setUsers(users.filter(u => u.id !== userId));
        toast({ title: 'کاربر حذف شد', description: "کاربر از سیستم حذف شد." });
    } catch(error) {
        console.error("Error deleting user: ", error);
        toast({ variant: 'destructive', title: "حذف ناموفق", description: "امکان حذف کاربر از پایگاه داده وجود نداشت." });
    }
  };

  if (currentUser?.role !== 'manager') {
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
          <p className="text-muted-foreground">تیم نمایندگان فروش و مدیران خود را مدیریت کنید.</p>
        </div>
        <Button onClick={() => setEditingUser({ full_name: '', username: '', role: 'sales', coupon_limit_per_month: 10 })}>
          <PlusCircle className="ml-2 h-4 w-4" /> افزودن کاربر
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
             <div className="flex items-center justify-center h-48">
                <LoaderCircle className="h-10 w-10 animate-spin" />
             </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">نام کامل</TableHead>
                <TableHead className="text-right">نام کاربری</TableHead>
                <TableHead className="text-right">نقش</TableHead>
                <TableHead className="text-right">سقف کوپن</TableHead>
                <TableHead className="text-right">تاریخ ایجاد</TableHead>
                <TableHead className="text-center">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-right">{user.full_name}</TableCell>
                  <TableCell className="text-right">{user.username}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                      {user.role === 'manager' ? 'مدیر' : 'نماینده فروش'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{user.role === 'sales' ? user.coupon_limit_per_month : 'N/A'}</TableCell>
                  <TableCell className="text-right">{new Date(user.created_at).toLocaleDateString('fa-IR')}</TableCell>
                  <TableCell className="text-center">
                    <AlertDialog>
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">باز کردن منو</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>ویرایش</DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600" disabled={user.id === currentUser?.id}>
                                  حذف
                              </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>آیا کاملاً مطمئن هستید؟</AlertDialogTitle>
                            <AlertDialogDescription>
                             این عملیات قابل بازگشت نیست. این کار حساب کاربری و تمام داده‌های مرتبط با آن را برای همیشه حذف می‌کند.
                            </AlertDialogDescription>
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
