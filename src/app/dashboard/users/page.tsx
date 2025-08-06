'use client';

import { useState } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
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
import { users as initialUsers, User } from '@/lib/data';
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
} from "@/components/ui/alert-dialog"

function UserForm({
  user,
  onSave,
  onClose,
}: {
  user: Partial<User> | null;
  onSave: (user: Partial<User>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState<Partial<User>>(
    user || { full_name: '', username: '', role: 'sales', password_hash: '' }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: 'sales' | 'manager') => {
    setFormData((prev) => ({...prev, role: value}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };
  
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">{user.id ? 'Edit User' : 'Add New User'}</DialogTitle>
          <DialogDescription>
            {user.id ? 'Update user details and role.' : 'Create a new sales agent or manager.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" name="full_name" value={formData.full_name || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" value={formData.username || ''} onChange={handleChange} />
          </div>
           <div>
            <Label htmlFor="password_hash">Password</Label>
            <Input id="password_hash" name="password_hash" type="password" placeholder={user.id ? 'Leave blank to keep unchanged' : ''} value={formData.password_hash || ''} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={handleRoleChange} defaultValue={formData.role}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales Agent</SelectItem>
                <SelectItem value="manager">Sales Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  
  const handleSave = (userData: Partial<User>) => {
     if (userData.id) {
      // Edit
      setUsers(users.map(u => u.id === userData.id ? { ...u, ...userData, password_hash: userData.password_hash || u.password_hash } as User : u));
      toast({ title: 'User Updated', description: `${userData.full_name}'s profile has been updated.` });
    } else {
      // Add
      const newUser: User = {
        id: Math.max(...users.map(u => u.id)) + 1,
        full_name: userData.full_name || '',
        username: userData.username || '',
        password_hash: userData.password_hash || 'password',
        role: userData.role || 'sales',
        created_at: new Date().toISOString(),
      };
      setUsers([newUser, ...users]);
      toast({ title: 'User Added', description: `${newUser.full_name} has been added to the system.` });
    }
    setEditingUser(null);
  };

  const handleDelete = (userId: number) => {
    if (userId === currentUser?.id) {
        toast({ variant: 'destructive', title: 'Action Forbidden', description: "You cannot delete your own account." });
        return;
    }
    setUsers(users.filter(u => u.id !== userId));
     toast({ variant: 'destructive', title: 'User Deleted', description: "The user has been removed from the system." });
  };

  if (currentUser?.role !== 'manager') {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
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
          <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage your team of sales agents and managers.</p>
        </div>
        <Button onClick={() => setEditingUser({ full_name: '', username: '', role: 'sales', password_hash: '' })}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
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
                          <DropdownMenuItem onClick={() => setEditingUser(user)}>Edit</DropdownMenuItem>
                          <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-red-600" disabled={user.id === currentUser.id}>
                                  Delete
                              </DropdownMenuItem>
                          </AlertDialogTrigger>
                        </DropdownMenuContent>
                      </DropdownMenu>
                       <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user's account and all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(user.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
