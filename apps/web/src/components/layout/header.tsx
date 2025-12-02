'use client';

import { useState } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { Input } from '@/components/ui';

interface HeaderProps {
  title: string;
}

// 임시 알림 데이터
const mockNotifications = [
  { id: 1, message: '새로운 예약이 등록되었습니다', time: '5분 전', read: false },
  { id: 2, message: '초코의 예방접종 일정이 다가왔습니다', time: '1시간 전', read: false },
  { id: 3, message: '진료 기록이 업데이트되었습니다', time: '2시간 전', read: true },
];

export function Header({ title }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="검색..."
            className="w-64 pl-9"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-full p-2 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="font-semibold">알림</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.length === 0 ? (
                  <p className="p-4 text-center text-gray-500">알림이 없습니다</p>
                ) : (
                  mockNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t">
                <button className="w-full text-center text-sm text-primary hover:underline py-2">
                  모든 알림 보기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
