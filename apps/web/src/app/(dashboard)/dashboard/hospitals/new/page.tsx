'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui';
import { hospitalsApi } from '@/lib/api';

const hospitalSchema = z.object({
  name: z.string().min(1, '병원명을 입력하세요'),
  businessNumber: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, '올바른 사업자번호 형식이 아닙니다 (예: 123-45-67890)'),
  address: z.string().min(1, '주소를 입력하세요'),
  addressDetail: z.string().optional(),
  phone: z
    .string()
    .regex(
      /^(0\d{1,2})-?(\d{3,4})-?(\d{4})$/,
      '올바른 전화번호 형식이 아닙니다'
    ),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
});

type HospitalFormData = z.infer<typeof hospitalSchema>;

export default function NewHospitalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HospitalFormData>({
    resolver: zodResolver(hospitalSchema),
  });

  const onSubmit = async (data: HospitalFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await hospitalsApi.create({
        name: data.name,
        businessNumber: data.businessNumber,
        address: data.address,
        addressDetail: data.addressDetail || undefined,
        phone: data.phone,
        email: data.email || undefined,
      });

      router.push('/dashboard/hospitals');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '병원 등록에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="병원 등록" />

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard/hospitals"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            병원 목록으로 돌아가기
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>새 병원 등록</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">병원명 *</Label>
                    <Input
                      id="name"
                      placeholder="예: 해피펫 동물병원"
                      {...register('name')}
                      error={errors.name?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessNumber">사업자번호 *</Label>
                    <Input
                      id="businessNumber"
                      placeholder="123-45-67890"
                      {...register('businessNumber')}
                      error={errors.businessNumber?.message}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">주소 *</Label>
                    <Input
                      id="address"
                      placeholder="기본 주소"
                      {...register('address')}
                      error={errors.address?.message}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="addressDetail">상세 주소</Label>
                    <Input
                      id="addressDetail"
                      placeholder="상세 주소 (건물명, 층 등)"
                      {...register('addressDetail')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호 *</Label>
                    <Input
                      id="phone"
                      placeholder="02-1234-5678"
                      {...register('phone')}
                      error={errors.phone?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="hospital@example.com"
                      {...register('email')}
                      error={errors.email?.message}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Link href="/dashboard/hospitals">
                    <Button type="button" variant="outline">
                      취소
                    </Button>
                  </Link>
                  <Button type="submit" isLoading={isLoading}>
                    등록하기
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
