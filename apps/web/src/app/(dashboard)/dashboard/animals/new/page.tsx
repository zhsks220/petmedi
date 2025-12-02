'use client';

import { useState, useEffect } from 'react';
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
  NativeSelect,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui';
import { animalsApi } from '@/lib/api';

const animalSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요'),
  species: z.string().min(1, '종류를 선택하세요'),
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().min(1, '성별을 선택하세요'),
  weight: z.string().optional(),
  microchipId: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
});

type AnimalFormData = z.infer<typeof animalSchema>;

export default function NewAnimalPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AnimalFormData>({
    resolver: zodResolver(animalSchema),
  });

  const onSubmit = async (data: AnimalFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await animalsApi.create({
        name: data.name,
        species: data.species,
        breed: data.breed || undefined,
        birthDate: data.birthDate || undefined,
        gender: data.gender,
        weight: data.weight ? parseFloat(data.weight) : undefined,
        microchipId: data.microchipId || undefined,
        color: data.color || undefined,
        notes: data.notes || undefined,
      });

      router.push('/dashboard/animals');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '동물 등록에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="동물 등록" />

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard/animals"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            동물 목록으로 돌아가기
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>새 동물 등록</CardTitle>
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
                    <Label htmlFor="name">이름 *</Label>
                    <Input
                      id="name"
                      placeholder="동물 이름"
                      {...register('name')}
                      error={errors.name?.message}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="species">종류 *</Label>
                    <NativeSelect
                      id="species"
                      {...register('species')}
                      error={errors.species?.message}
                    >
                      <option value="">선택하세요</option>
                      <option value="DOG">강아지</option>
                      <option value="CAT">고양이</option>
                      <option value="BIRD">조류</option>
                      <option value="RABBIT">토끼</option>
                      <option value="HAMSTER">햄스터</option>
                      <option value="REPTILE">파충류</option>
                      <option value="OTHER">기타</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="breed">품종</Label>
                    <Input
                      id="breed"
                      placeholder="예: 골든 리트리버"
                      {...register('breed')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">성별 *</Label>
                    <NativeSelect
                      id="gender"
                      {...register('gender')}
                      error={errors.gender?.message}
                    >
                      <option value="">선택하세요</option>
                      <option value="MALE">수컷</option>
                      <option value="FEMALE">암컷</option>
                      <option value="UNKNOWN">모름</option>
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birthDate">생년월일</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      {...register('birthDate')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">체중 (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      placeholder="예: 5.5"
                      {...register('weight')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="microchipId">마이크로칩 ID</Label>
                    <Input
                      id="microchipId"
                      placeholder="마이크로칩 번호"
                      {...register('microchipId')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">털색</Label>
                    <Input
                      id="color"
                      placeholder="예: 갈색, 흰색"
                      {...register('color')}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">메모</Label>
                    <Input
                      id="notes"
                      placeholder="특이사항이나 메모를 입력하세요"
                      {...register('notes')}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Link href="/dashboard/animals">
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
