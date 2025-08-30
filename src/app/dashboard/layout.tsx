'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Package,
  Users,
  Ticket,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Menu,
  Sparkles,
  User as UserIcon,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { User } from '@/lib/data';

function NavLink({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function UserMenu({ user, logout }: { user: User; logout: () => void }) {
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-full justify-start text-left font-normal px-2">
            <div className="flex items-center gap-2">
                 <div className="p-2 bg-muted rounded-full"><UserIcon className="h-5 w-5" /></div>
                 <div className="flex flex-col">
                    <span className="font-semibold text-sm">{user.full_name}</span>
                    <span className="text-xs text-muted-foreground capitalize">{user.role === 'manager' ? 'مدیر' : 'نماینده فروش'}</span>
                 </div>
            </div>
          <ChevronDown className="mr-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.full_name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="ml-2 h-4 w-4" />
          <span>خروج</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarNav({ user }: { user: User }) {
  return (
    <nav className="grid items-start gap-1 text-sm font-medium">
      <NavLink href="/dashboard" icon={LayoutDashboard}>داشبورد</NavLink>
      <NavLink href="/dashboard/coupons" icon={Ticket}>کوپن‌ها</NavLink>
      {user.role === 'manager' && (
        <>
          <NavLink href="/dashboard/products" icon={Package}>محصولات</NavLink>
          <NavLink href="/dashboard/users" icon={Users}>کاربران</NavLink>
          <NavLink href="/dashboard/optimize" icon={Sparkles}>بهینه‌ساز هوشمند</NavLink>
          <NavLink href="/dashboard/settings" icon={Settings}>تنظیمات</NavLink>
        </>
      )}
    </nav>
  );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }
  
  const SidebarContent = () => (
    <>
      <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-headline font-semibold">
              <Ticket className="h-6 w-6 text-primary" />
              <span className="">کوپن‌کرافتر</span>
            </Link>
          </div>
          <div className="flex-1">
            <div className="grid items-start p-4">
              <SidebarNav user={user} />
            </div>
          </div>
          <div className="mt-auto p-4 border-t">
            <UserMenu user={user} logout={logout} />
          </div>
        </div>
    </>
  )

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 md:hidden">
           <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">باز کردن منوی ناوبری</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col p-0">
               <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
             <Link href="/dashboard" className="flex items-center gap-2 font-headline font-semibold">
              <Ticket className="h-6 w-6 text-primary" />
              <span className="">کوپن‌کرافتر</span>
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
       <div className="hidden border-l bg-card md:block">
        <SidebarContent />
      </div>
    </div>
  );
}
