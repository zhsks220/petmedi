'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui';
import { SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

const loginSchema = z.object({
  email: z.string().email('유효한 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '로그인에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsAdminLoading(true);
    setError(null);

    try {
      await login('admin@petmedi.kr', 'admin123!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '관리자 로그인에 실패했습니다');
    } finally {
      setIsAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-white to-transparent" />
      </div>

      <SlideUp className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border shadow-sm mb-4"
          >
            <span className="text-2xl">🐾</span>
          </motion.div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">PetMedi에 다시 오신 것을 환영합니다</h2>
          <p className="mt-2 text-sm text-slate-500">계정을 관리하고 병원 업무를 시작하세요</p>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 font-medium">비밀번호</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  error={errors.password?.message}
                  className="h-10 bg-white border-slate-200 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/10 transition-all font-sans"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-none transition-all mt-2"
                isLoading={isLoading}
              >
                로그인
              </Button>
            </CardContent>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-lg">
              <Button
                type="button"
                variant="outline"
                className="w-full h-9 text-xs font-medium border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                isLoading={isAdminLoading}
                onClick={handleAdminLogin}
              >
                🔐 데모 관리자 계정으로 빠른 시작
              </Button>
              <p className="mt-4 text-center text-xs text-slate-500">
                계정이 없으신가요?{' '}
                <Link
                  href="/register"
                  className="text-slate-900 font-semibold hover:underline"
                >
                  회원가입
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </SlideUp>
    </div>
  );
}
