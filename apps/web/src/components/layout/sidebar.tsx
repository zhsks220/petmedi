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
  Search,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

const navGroups: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: '진료',
    items: [
      { name: '예약 관리', href: '/dashboard/appointments', icon: Calendar },
      { name: '진료 기록', href: '/dashboard/medical-records', icon: FileText },
      { name: '동물 관리', href: '/dashboard/animals', icon: PawPrint },
    ],
  },
  {
    title: '경영',
    items: [
      { name: '병원 관리', href: '/dashboard/hospitals', icon: Building2 },
      { name: '직원 관리', href: '/dashboard/users', icon: Users },
      { name: '재고 관리', href: '/dashboard/inventory', icon: Package },
      { name: '수납/청구', href: '/dashboard/billing', icon: CreditCard },
    ],
  },
  {
    title: '시스템',
    items: [
      { name: '알림', href: '/dashboard/notifications', icon: Bell },
      { name: '설정', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-[240px] flex-col bg-slate-50 border-r border-slate-200 text-slate-600 font-sans">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors group">
        <div className="h-6 w-6 rounded bg-slate-900 text-white flex items-center justify-center text-xs font-bold mr-3">
          P
        </div>
        <span className="font-semibold text-slate-900 group-hover:text-slate-700">PetMedi</span>
        <ChevronDown className="ml-auto h-4 w-4 text-slate-400" />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-3">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-slate-500 rounded-md border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-sm">
          <Search className="h-4 w-4" />
          <span>빠른 검색</span>
          <kbd className="ml-auto text-[10px] font-mono border border-slate-200 rounded px-1 bg-slate-50 text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx}>
            {group.title && (
              <h3 className="px-2 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {group.title}
              </h3>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-slate-200/60 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-slate-900" : "text-slate-500")} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100 transition-colors cursor-pointer" onClick={logout}>
          <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-medium text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.name || '사용자'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
          <LogOut className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </aside>
  );
}
