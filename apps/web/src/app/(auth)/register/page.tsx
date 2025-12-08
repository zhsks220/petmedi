'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth-context';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';
import { SlideUp } from '@/components/ui/motion-wrapper';

const registerSchema = z
  .object({
    name: z.string().min(2, '이름은 2자 이상이어야 합니다'),
    email: z.string().email('유효한 이메일을 입력하세요'),
    phone: z
      .string()
      .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '유효한 전화번호를 입력하세요')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(6, '비밀번호는 6자 이상이어야 합니다')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*[0-9])/,
        '비밀번호는 영문과 숫자를 포함해야 합니다'
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '회원가입에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <SlideUp className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <span className="text-4xl">🐾</span>
            </div>
            <CardTitle className="text-2xl">회원가입</CardTitle>
            <CardDescription>
              PetMedi와 함께 더 나은 동물 의료 서비스를 시작하세요
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  {...register('name')}
                  error={errors.name?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@hospital.com"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 (선택)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  {...register('phone')}
                  error={errors.phone?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="영문, 숫자 포함 6자 이상"
                  {...register('password')}
                  error={errors.password?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  {...register('confirmPassword')}
                  error={errors.confirmPassword?.message}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                회원가입
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                이미 계정이 있으신가요?{' '}
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium"
                >
                  로그인
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </SlideUp>
    </div>
  );
}
