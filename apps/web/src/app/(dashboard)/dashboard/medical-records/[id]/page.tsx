'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, FileText, PawPrint, Building2, User } from 'lucide-react';
import { Header } from '@/components/layout/header';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/ui';
import { medicalRecordsApi } from '@/lib/api';
import { getVisitTypeLabel, formatDate, formatDateTime } from '@/lib/utils';

interface MedicalRecord {
  id: string;
  visitType: string;
  chiefComplaint: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  nextVisitDate?: string;
  animal: {
    id: string;
    name: string;
    animalCode: string;
    species: string;
    breed?: string;
  };
  hospital: {
    id: string;
    name: string;
    address: string;
  };
  veterinarian?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function MedicalRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const response = await medicalRecordsApi.getById(params.id as string);
        setRecord(response.data);
      } catch (error) {
        console.error('Failed to fetch medical record:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchRecord();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('정말 이 진료 기록을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      await medicalRecordsApi.delete(params.id as string);
      router.push('/dashboard/medical-records');
    } catch (error) {
      console.error('Failed to delete medical record:', error);
      alert('삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="진료 기록 상세" />
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

  if (!record) {
    return (
      <div className="flex flex-col h-full">
        <Header title="진료 기록 상세" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">진료 기록을 찾을 수 없습니다</p>
            <Link href="/dashboard/medical-records">
              <Button variant="outline" className="mt-4">
                목록으로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getVisitTypeBadgeVariant = (
    visitType: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' => {
    switch (visitType) {
      case 'EMERGENCY':
        return 'destructive';
      case 'SURGERY':
        return 'warning';
      case 'VACCINATION':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="진료 기록 상세" />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard/medical-records"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              진료 기록 목록으로 돌아가기
            </Link>
            <div className="flex gap-2">
              <Link href={`/dashboard/medical-records/${record.id}/edit`}>
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
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={getVisitTypeBadgeVariant(record.visitType)}>
                          {getVisitTypeLabel(record.visitType)}
                        </Badge>
                      </div>
                      <CardTitle className="text-2xl">진료 기록</CardTitle>
                      <p className="text-muted-foreground mt-1">
                        {formatDateTime(record.createdAt)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Medical Details */}
              <Card>
                <CardHeader>
                  <CardTitle>진료 내용</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      주요 증상 / 내원 사유
                    </h4>
                    <p className="whitespace-pre-wrap">{record.chiefComplaint}</p>
                  </div>

                  {record.symptoms && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        세부 증상
                      </h4>
                      <p className="whitespace-pre-wrap">{record.symptoms}</p>
                    </div>
                  )}

                  {record.diagnosis && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        진단
                      </h4>
                      <p className="whitespace-pre-wrap">{record.diagnosis}</p>
                    </div>
                  )}

                  {record.treatment && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        치료 내용
                      </h4>
                      <p className="whitespace-pre-wrap">{record.treatment}</p>
                    </div>
                  )}

                  {record.prescription && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        처방
                      </h4>
                      <p className="whitespace-pre-wrap">{record.prescription}</p>
                    </div>
                  )}

                  {record.notes && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        비고
                      </h4>
                      <p className="whitespace-pre-wrap">{record.notes}</p>
                    </div>
                  )}

                  {record.nextVisitDate && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        다음 방문 예정일
                      </h4>
                      <p>{formatDate(record.nextVisitDate)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Patient Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PawPrint className="h-5 w-5" />
                    환자 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">이름</p>
                      <p className="font-medium">{record.animal.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">고유 코드</p>
                      <p className="font-mono">{record.animal.animalCode}</p>
                    </div>
                    {record.animal.breed && (
                      <div>
                        <p className="text-sm text-muted-foreground">품종</p>
                        <p>{record.animal.breed}</p>
                      </div>
                    )}
                    <Link
                      href={`/dashboard/animals/${record.animal.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      환자 상세 보기 →
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Hospital Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    병원 정보
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">병원명</p>
                      <p className="font-medium">{record.hospital.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">주소</p>
                      <p className="text-sm">{record.hospital.address}</p>
                    </div>
                    <Link
                      href={`/dashboard/hospitals/${record.hospital.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      병원 상세 보기 →
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Veterinarian Info */}
              {record.veterinarian && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      담당 수의사
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{record.veterinarian.name}</p>
                  </CardContent>
                </Card>
              )}

              {/* Record Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">기록 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">작성일</span>
                      <span>{formatDateTime(record.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">최종 수정</span>
                      <span>{formatDateTime(record.updatedAt)}</span>
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
