'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, PawPrint, FileText, Plus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/ui';
import { animalsApi, medicalRecordsApi } from '@/lib/api';
import {
  getSpeciesLabel,
  getGenderLabel,
  calculateAge,
  formatDate,
  getVisitTypeLabel,
} from '@/lib/utils';

interface MedicalRecord {
  id: string;
  visitType: string;
  chiefComplaint: string;
  diagnosis?: string;
  createdAt: string;
  veterinarian?: { name: string };
}

interface Animal {
  id: string;
  animalCode: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  gender: string;
  weight?: number;
  microchipId?: string;
  isNeutered: boolean;
  isDeceased: boolean;
  owner?: { id: string; name: string; phone?: string; email: string };
  hospital?: { id: string; name: string };
  medicalRecords?: MedicalRecord[];
  createdAt: string;
}

export default function AnimalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchAnimal = async () => {
      try {
        const response = await animalsApi.getById(params.id as string);
        setAnimal(response.data);

        // Fetch medical records
        const recordsResponse = await medicalRecordsApi.getByAnimal(
          params.id as string
        );
        const recordsData = Array.isArray(recordsResponse.data)
          ? recordsResponse.data
          : recordsResponse.data?.data || [];
        setAnimal((prev) =>
          prev ? { ...prev, medicalRecords: recordsData } : null
        );
      } catch (error) {
        console.error('Failed to fetch animal:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchAnimal();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('정말 이 동물을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      await animalsApi.delete(params.id as string);
      router.push('/dashboard/animals');
    } catch (error) {
      console.error('Failed to delete animal:', error);
      alert('삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="동물 상세" />
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-100 rounded w-1/4" />
              <div className="h-64 bg-gray-100 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!animal) {
    return (
      <div className="flex flex-col h-full">
        <Header title="동물 상세" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <PawPrint className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">동물을 찾을 수 없습니다</p>
            <Link href="/dashboard/animals">
              <Button variant="outline" className="mt-4">
                목록으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="동물 상세" />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard/animals"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              동물 목록으로 돌아가기
            </Link>
            <div className="flex gap-2">
              <Link href={`/dashboard/animals/${animal.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <PawPrint className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{animal.name}</CardTitle>
                        <p className="text-muted-foreground mt-1">
                          {animal.animalCode}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{getSpeciesLabel(animal.species)}</Badge>
                      {animal.isNeutered && <Badge variant="secondary">중성화</Badge>}
                      {animal.isDeceased && <Badge variant="destructive">사망</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">품종</p>
                      <p className="font-medium">{animal.breed || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">성별</p>
                      <p className="font-medium">{getGenderLabel(animal.gender)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">나이</p>
                      <p className="font-medium">
                        {animal.birthDate ? calculateAge(animal.birthDate) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">체중</p>
                      <p className="font-medium">
                        {animal.weight ? `${animal.weight} kg` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">생년월일</p>
                      <p className="font-medium">
                        {animal.birthDate ? formatDate(animal.birthDate) : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">마이크로칩</p>
                      <p className="font-medium">{animal.microchipId || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Medical Records */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    진료 기록
                  </CardTitle>
                  <Link
                    href={`/dashboard/medical-records/new?animalId=${animal.id}`}
                  >
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      새 진료 기록
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {!animal.medicalRecords ||
                  animal.medicalRecords.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      진료 기록이 없습니다
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {animal.medicalRecords.map((record) => (
                        <Link
                          key={record.id}
                          href={`/dashboard/medical-records/${record.id}`}
                        >
                          <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">
                                {getVisitTypeLabel(record.visitType)}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {formatDate(record.createdAt)}
                              </span>
                            </div>
                            <p className="font-medium">{record.chiefComplaint}</p>
                            {record.diagnosis && (
                              <p className="text-sm text-muted-foreground mt-1">
                                진단: {record.diagnosis}
                              </p>
                            )}
                            {record.veterinarian && (
                              <p className="text-xs text-muted-foreground mt-2">
                                담당: {record.veterinarian.name}
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Owner Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">보호자 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  {animal.owner ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">이름</p>
                        <p className="font-medium">{animal.owner.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">이메일</p>
                        <p className="font-medium">{animal.owner.email}</p>
                      </div>
                      {animal.owner.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">전화번호</p>
                          <p className="font-medium">{animal.owner.phone}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">보호자 정보 없음</p>
                  )}
                </CardContent>
              </Card>

              {/* Hospital Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">등록 병원</CardTitle>
                </CardHeader>
                <CardContent>
                  {animal.hospital ? (
                    <div>
                      <p className="font-medium">{animal.hospital.name}</p>
                      <Link
                        href={`/dashboard/hospitals/${animal.hospital.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        병원 상세 보기 →
                      </Link>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">병원 정보 없음</p>
                  )}
                </CardContent>
              </Card>

              {/* Registration Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">등록 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">등록일</span>
                      <span>{formatDate(animal.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">고유 코드</span>
                      <span className="font-mono">{animal.animalCode}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
