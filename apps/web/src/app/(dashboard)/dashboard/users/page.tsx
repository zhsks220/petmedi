'use client';

import { useEffect, useState } from 'react';
import { Search, Users, Mail, Phone } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Input, Card, CardContent, Badge } from '@/components/ui';
import { usersApi } from '@/lib/api';
import { getRoleLabel, formatDate } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  hospital?: {
    name: string;
  };
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await usersApi.getAll();
        setUsers(response.data);
        setFilteredUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.name.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.phone?.includes(term)
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const getRoleBadgeVariant = (
    role: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'HOSPITAL_ADMIN':
        return 'default';
      case 'VETERINARIAN':
        return 'success';
      case 'TECHNICIAN':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="사용자 관리" />

      <div className="flex-1 p-6 space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="이름, 이메일, 전화번호로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              사용자가 없습니다
            </h3>
            <p className="text-muted-foreground">
              검색 조건을 변경해 보세요
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-medium text-primary">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {user.hospital?.name || '소속 없음'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                    가입일: {formatDate(user.createdAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
