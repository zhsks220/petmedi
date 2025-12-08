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
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn } from '@/components/ui/motion-wrapper';

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white to-transparent" />
      </div>

      <SlideUp className="w-full max-w-[450px] relative z-10">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border shadow-sm mb-4"
          >
            <span className="text-2xl">🐾</span>
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">PetMedi 계정 생성</h2>
          <p className="mt-2 text-sm text-slate-500">효율적인 병원 관리를 위한 첫 걸음</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="pt-6 space-y-4">
              <AnimatePresence>
                {error && (
                  <FadeIn>
                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  </FadeIn>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="홍길동"
                  {...register('name')}
                  error={errors.name?.message}
                  className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all font-sans"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@hospital.com"
                  {...register('email')}
                  error={errors.email?.message}
                  className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all font-sans"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-700 font-medium">전화번호 (선택)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-1234-5678"
                  {...register('phone')}
                  error={errors.phone?.message}
                  className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-700 font-medium">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••"
                    {...register('password')}
                    error={errors.password?.message}
                    className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all font-sans"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">비밀번호 확인</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••"
                    {...register('confirmPassword')}
                    error={errors.confirmPassword?.message}
                    className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all font-sans"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-none transition-all mt-4"
                isLoading={isLoading}
              >
                회원가입
              </Button>
            </CardContent>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg text-center">
              <p className="text-xs text-slate-500">
                이미 계정이 있으신가요?{' '}
                <Link
                  href="/login"
                  className="text-slate-900 font-semibold hover:underline"
                >
                  로그인
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </SlideUp>
    </div>
  );
}
