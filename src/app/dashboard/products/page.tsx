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
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';


function ProductForm({
  product,
  onSave,
  onClose,
}: {
  product: Partial<Product> | null;
  onSave: (product: Product) => Promise<boolean>;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || { name: '', description: '', price: 0, is_active: true }
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isNumber = type === 'number';
    setFormData((prev) => ({ ...prev, [name]: isNumber ? parseFloat(value) : value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, is_active: checked }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData as Product);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">{product.id ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product.id ? 'Update the details for this product.' : 'Fill in the information for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} required/>
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" value={formData.price || 0} onChange={handleChange} required/>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="is_active" checked={formData.is_active} onCheckedChange={handleSwitchChange} />
            <Label htmlFor="is_active">Active</Label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
                {isSaving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const productsCollection = collection(db, "products");
        const productsSnapshot = await getDocs(productsCollection);
        const productsList = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(productsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error fetching products',
          description: 'Could not load products from the database.',
        });
        console.error("Error fetching products: ", error);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [toast]);

  const handleSave = async (productData: Product) => {
    try {
      if (productData.id) {
        // Edit
        const productRef = doc(db, "products", productData.id);
        await setDoc(productRef, productData, { merge: true });
        setProducts(products.map(p => p.id === productData.id ? { ...p, ...productData } : p));
        toast({ title: "Product Updated", description: `${productData.name} has been updated.` });
      } else {
        // Add
        const newProductData: Omit<Product, 'id'> = {
          name: productData.name!,
          description: productData.description!,
          price: productData.price!,
          is_active: productData.is_active!,
          created_at: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, "products"), newProductData);
        const newProduct: Product = { ...newProductData, id: docRef.id };
        setProducts(prev => [newProduct, ...prev]);
        toast({ title: "Product Added", description: `${newProduct.name} has been added.` });
      }
      setEditingProduct(null);
      return true;
    } catch (error) {
      console.error("Error saving product: ", error);
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save product to the database." });
      return false;
    }
  };

  const handleDelete = async (productId: string) => {
    try {
        await deleteDoc(doc(db, "products", productId));
        setProducts(products.filter(p => p.id !== productId));
        toast({ title: "Product Deleted", description: `The product has been removed.` });
    } catch (error) {
        console.error("Error deleting product: ", error);
        toast({ variant: 'destructive', title: "Delete Failed", description: "Could not remove product from the database." });
    }
  };
  
  if (user?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
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
          <h1 className="text-3xl font-bold font-headline tracking-tight">Products</h1>
          <p className="text-muted-foreground">Manage your inventory of modems and other products.</p>
        </div>
        <Button onClick={() => setEditingProduct({ name: '', description: '', price: 0, is_active: true, created_at: new Date().toISOString() })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
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
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? 'default' : 'outline'} className={product.is_active ? 'bg-green-500/20 text-green-700 border-green-500/30' : ''}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{new Date(product.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setEditingProduct(product)}>Edit</DropdownMenuItem>
                           <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the product
                              and may affect existing coupons.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(product.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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
