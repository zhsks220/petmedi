'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/header';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { usersApi } from '@/lib/api';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

const profileSchema = z.object({
  name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
  phone: z
    .string()
    .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '유효한 전화번호를 입력하세요')
    .optional()
    .or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!user?.id) {
      setError('사용자 정보를 찾을 수 없습니다');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await usersApi.update(user.id, {
        name: data.name,
        phone: data.phone || undefined,
      });
      await refreshUser();
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '프로필 수정에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="설정" />

      <StaggerContainer className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Profile Settings */}
          <SlideUp>
            <Card>
              <CardHeader>
                <CardTitle>프로필 설정</CardTitle>
                <CardDescription>
                  계정 정보를 수정할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {success && (
                    <FadeIn className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
                      프로필이 성공적으로 수정되었습니다
                    </FadeIn>
                  )}

                  {error && (
                    <FadeIn className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                      {error}
                    </FadeIn>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      이메일은 변경할 수 없습니다
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name">이름</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      error={errors.name?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <Input
                      id="phone"
                      placeholder="010-1234-5678"
                      {...register('phone')}
                      error={errors.phone?.message}
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" isLoading={isLoading}>
                      저장하기
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Account Info */}
          <SlideUp>
            <Card>
              <CardHeader>
                <CardTitle>계정 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">역할</span>
                    <span className="font-medium">
                      {user?.role === 'SUPER_ADMIN' && '슈퍼관리자'}
                      {user?.role === 'HOSPITAL_ADMIN' && '병원관리자'}
                      {user?.role === 'VETERINARIAN' && '수의사'}
                      {user?.role === 'TECHNICIAN' && '테크니션'}
                      {user?.role === 'RECEPTIONIST' && '접수원'}
                      {user?.role === 'PET_OWNER' && '보호자'}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">사용자 ID</span>
                    <span className="font-mono text-sm">{user?.id}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Danger Zone */}
          <SlideUp>
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">위험 영역</CardTitle>
                <CardDescription>
                  계정 삭제는 되돌릴 수 없습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" disabled>
                  계정 삭제 (준비 중)
                </Button>
              </CardContent>
            </Card>
          </SlideUp>
        </div>
      </StaggerContainer>
    </div>
  );
}
