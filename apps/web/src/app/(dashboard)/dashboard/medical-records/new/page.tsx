'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui';
import { medicalRecordsApi, animalsApi, hospitalsApi } from '@/lib/api';

const medicalRecordSchema = z.object({
  animalId: z.string().min(1, '환자를 선택하세요'),
  hospitalId: z.string().min(1, '병원을 선택하세요'),
  visitDate: z.string().optional(),
  chiefComplaint: z.string().min(1, '주요 증상을 입력하세요'),
  subjective: z.string().optional(),
  diagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  proceduresPerformed: z.string().optional(),
  internalNotes: z.string().optional(),
  followUpDate: z.string().optional(),
});

type MedicalRecordFormData = z.infer<typeof medicalRecordSchema>;

interface Animal {
  id: string;
  name: string;
  animalCode: string;
}

interface Hospital {
  id: string;
  name: string;
}

export default function NewMedicalRecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAnimalId = searchParams.get('animalId');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<MedicalRecordFormData>({
    resolver: zodResolver(medicalRecordSchema),
    defaultValues: {
      animalId: preselectedAnimalId || '',
      visitDate: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animalsRes, hospitalsRes] = await Promise.all([
          animalsApi.getAll(),
          hospitalsApi.getAll(),
        ]);
        const animalsData = Array.isArray(animalsRes.data) ? animalsRes.data : animalsRes.data?.data || [];
        const hospitalsData = Array.isArray(hospitalsRes.data) ? hospitalsRes.data : hospitalsRes.data?.data || [];
        setAnimals(animalsData);
        setHospitals(hospitalsData);

        if (preselectedAnimalId) {
          setValue('animalId', preselectedAnimalId);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, [preselectedAnimalId, setValue]);

  const onSubmit = async (data: MedicalRecordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await medicalRecordsApi.create({
        animalId: data.animalId,
        hospitalId: data.hospitalId,
        visitDate: data.visitDate || undefined,
        chiefComplaint: data.chiefComplaint,
        subjective: data.subjective || undefined,
        diagnosis: data.diagnosis || undefined,
        treatmentPlan: data.treatmentPlan || undefined,
        proceduresPerformed: data.proceduresPerformed || undefined,
        internalNotes: data.internalNotes || undefined,
        followUpDate: data.followUpDate || undefined,
      });

      router.push('/dashboard/medical-records');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || '진료 기록 생성에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="진료 기록 작성" />

      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/dashboard/medical-records"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            진료 기록 목록으로 돌아가기
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>새 진료 기록</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                    {error}
                  </div>
                )}

                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="animalId">환자 *</Label>
                    <NativeSelect
                      id="animalId"
                      {...register('animalId')}
                      error={errors.animalId?.message}
                    >
                      <option value="">선택하세요</option>
                      {animals.map((animal) => (
                        <option key={animal.id} value={animal.id}>
                          {animal.name} ({animal.animalCode})
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hospitalId">병원 *</Label>
                    <NativeSelect
                      id="hospitalId"
                      {...register('hospitalId')}
                      error={errors.hospitalId?.message}
                    >
                      <option value="">선택하세요</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visitDate">내원일</Label>
                    <Input
                      id="visitDate"
                      type="date"
                      {...register('visitDate')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="followUpDate">다음 방문일</Label>
                    <Input
                      id="followUpDate"
                      type="date"
                      {...register('followUpDate')}
                    />
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="space-y-2">
                  <Label htmlFor="chiefComplaint">주요 증상 / 내원 사유 *</Label>
                  <Textarea
                    id="chiefComplaint"
                    placeholder="환자의 주요 증상이나 내원 사유를 입력하세요"
                    rows={3}
                    {...register('chiefComplaint')}
                    error={errors.chiefComplaint?.message}
                  />
                </div>

                {/* Subjective - Owner's observation */}
                <div className="space-y-2">
                  <Label htmlFor="subjective">보호자 진술 (Subjective)</Label>
                  <Textarea
                    id="subjective"
                    placeholder="보호자가 관찰한 내용을 기록하세요"
                    rows={3}
                    {...register('subjective')}
                  />
                </div>

                {/* Diagnosis */}
                <div className="space-y-2">
                  <Label htmlFor="diagnosis">진단 (Assessment)</Label>
                  <Textarea
                    id="diagnosis"
                    placeholder="진단 내용을 입력하세요"
                    rows={3}
                    {...register('diagnosis')}
                  />
                </div>

                {/* Treatment Plan */}
                <div className="space-y-2">
                  <Label htmlFor="treatmentPlan">치료 계획 (Plan)</Label>
                  <Textarea
                    id="treatmentPlan"
                    placeholder="치료 계획을 입력하세요"
                    rows={3}
                    {...register('treatmentPlan')}
                  />
                </div>

                {/* Procedures Performed */}
                <div className="space-y-2">
                  <Label htmlFor="proceduresPerformed">시행한 처치</Label>
                  <Textarea
                    id="proceduresPerformed"
                    placeholder="실시한 처치 내용을 기록하세요"
                    rows={3}
                    {...register('proceduresPerformed')}
                  />
                </div>

                {/* Internal Notes */}
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">내부 메모</Label>
                  <Textarea
                    id="internalNotes"
                    placeholder="추가 메모나 주의사항을 기록하세요"
                    rows={3}
                    {...register('internalNotes')}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Link href="/dashboard/medical-records">
                    <Button type="button" variant="outline">
                      취소
                    </Button>
                  </Link>
                  <Button type="submit" isLoading={isLoading}>
                    저장하기
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
