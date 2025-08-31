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
import { Product } from '@/lib/data';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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


function ProductForm({
  product,
  onSave,
  onClose,
}: {
  product: Partial<Product> | null;
  onSave: (product: Omit<Product, 'id' | 'created_at'>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || { name: '', description: '', price: 0, is_active: true }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const dataToSave = { ...formData };
    const success = await onSave(dataToSave as Omit<Product, 'id' | 'created_at'>);
    setIsSaving(false);
    if (success) onClose();
  };

  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">{product.id ? 'ویرایش محصول' : 'افزودن محصول جدید'}</DialogTitle>
          <DialogDescription>
            {product.id ? 'جزئیات این محصول را به‌روز کنید.' : 'اطلاعات محصول جدید را وارد کنید.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">نام محصول</Label>
            <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="description">توضیحات</Label>
            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} required/>
          </div>
          <div>
            <Label htmlFor="price">قیمت</Label>
            <Input id="price" name="price" type="number" value={formData.price || 0} onChange={handleChange} required/>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="is_active">فعال</Label>
            <Switch id="is_active" checked={formData.is_active} onCheckedChange={handleSwitchChange} dir="ltr" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>انصراف</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="ml-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'در حال ذخیره...' : 'ذخیره محصول'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'خطا در دریافت محصولات', description: error.message });
      console.error("Error fetching products: ", error);
    } else {
      setProducts(data);
    }
    setLoading(false);
  }, [supabase, toast]);
  
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSave = async (productData: Omit<Product, 'id' | 'created_at'>) => {
    let error;
    if (editingProduct?.id) { // Editing existing product
      const { error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);
      error = updateError;
    } else { // Adding new product
      const { error: insertError } = await supabase
        .from('products')
        .insert(productData);
      error = insertError;
    }

    if (error) {
      console.error("Error saving product: ", error);
      toast({ variant: "destructive", title: "ذخیره ناموفق", description: error.message });
      return false;
    }

    toast({ title: editingProduct?.id ? "محصول به‌روز شد" : "محصول اضافه شد" });
    setEditingProduct(null);
    fetchProducts(); // Refresh list
    return true;
  };

  const handleDelete = async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      console.error("Error deleting product: ", error);
      toast({ variant: 'destructive', title: "حذف ناموفق", description: error.message });
    } else {
      toast({ title: "محصول حذف شد", description: `محصول با موفقیت حذف شد.` });
      fetchProducts(); // Refresh list
    }
  };
  
  if (profile?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">دسترسی غیرمجاز</h1>
        <p className="text-muted-foreground">شما اجازه مشاهده این صفحه را ندارید.</p>
      </div>
    );
  }

  return (
    <>
      {editingProduct && (
        <ProductForm
          product={editingProduct}
          onSave={handleSave}
          onClose={() => setEditingProduct(null)}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">محصولات</h1>
          <p className="text-muted-foreground">موجودی مودم‌ها و سایر محصولات خود را مدیریت کنید.</p>
        </div>
        <Button onClick={() => setEditingProduct({ name: '', description: '', price: 0, is_active: true })}>
          <PlusCircle className="ml-2 h-4 w-4" /> افزودن محصول
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
                <TableHead className="text-right">نام</TableHead>
                <TableHead className="text-right">وضعیت</TableHead>
                <TableHead className="text-right">قیمت</TableHead>
                <TableHead className="text-right">تاریخ ایجاد</TableHead>
                <TableHead className="text-center">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium text-right">{product.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={product.is_active ? 'default' : 'outline'} className={product.is_active ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}>
                      {product.is_active ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{new Date(product.created_at).toLocaleDateString('fa-IR')}</TableCell>
                  <TableCell className="text-center">
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">باز کردن منو</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>عملیات</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>ویرایش</DropdownMenuItem>
                           <AlertDialogTrigger asChild><DropdownMenuItem className="text-red-600">حذف</DropdownMenuItem></AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>آیا کاملاً مطمئن هستید؟</AlertDialogTitle>
                            <AlertDialogDescription>این عملیات قابل بازگشت نیست. این کار محصول را برای همیشه حذف کرده و ممکن است روی کوپن‌های موجود تأثیر بگذارد.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90">حذف</AlertDialogAction>
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
