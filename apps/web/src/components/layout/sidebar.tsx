'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PawPrint,
  FileText,
  Building2,
  Users,
  Settings,
  LogOut,
  Calendar,
  CreditCard,
  Package,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '예약 관리', href: '/dashboard/appointments', icon: Calendar },
  { name: '수납 관리', href: '/dashboard/billing', icon: CreditCard },
  { name: '재고 관리', href: '/dashboard/inventory', icon: Package },
  { name: '알림 관리', href: '/dashboard/notifications', icon: Bell },
  { name: '동물 관리', href: '/dashboard/animals', icon: PawPrint },
  { name: '진료 기록', href: '/dashboard/medical-records', icon: FileText },
  { name: '병원 관리', href: '/dashboard/hospitals', icon: Building2 },
  { name: '사용자 관리', href: '/dashboard/users', icon: Users },
  { name: '설정', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 border-b">
        <span className="text-2xl">🐾</span>
        <span className="text-xl font-bold text-primary">PetMedi</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // 대시보드는 정확히 일치할 때만 활성화, 나머지는 시작 경로로 판단
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              {user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || '사용자'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
