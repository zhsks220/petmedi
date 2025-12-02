'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  PawPrint,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from '@/components/ui';
import { hospitalsApi } from '@/lib/api';
import { formatPhoneNumber, formatDate, getRoleLabel } from '@/lib/utils';

interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Hospital {
  id: string;
  name: string;
  businessNumber: string;
  address: string;
  addressDetail?: string;
  phone: string;
  email?: string;
  status: string;
  staff?: Staff[];
  _count?: {
    staff: number;
    animals: number;
    medicalRecords: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function HospitalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchHospital = async () => {
      try {
        const response = await hospitalsApi.getById(params.id as string);
        // Staff data is already included in the response from backend's findById
        const hospitalData = response.data;
        // Transform staff data to match expected format
        if (hospitalData.staff) {
          hospitalData.staff = hospitalData.staff.map((s: { user: Staff; position?: string }) => ({
            id: s.user.id,
            name: s.user.name,
            email: s.user.email,
            role: s.position || 'STAFF',
          }));
        }
        setHospital(hospitalData);
      } catch (error) {
        console.error('Failed to fetch hospital:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchHospital();
    }
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('정말 이 병원을 삭제하시겠습니까?')) return;

    setIsDeleting(true);
    try {
      await hospitalsApi.delete(params.id as string);
      router.push('/dashboard/hospitals');
    } catch (error) {
      console.error('Failed to delete hospital:', error);
      alert('삭제에 실패했습니다');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="success">운영중</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">비활성</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">정지</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="병원 상세" />
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

  if (!hospital) {
    return (
      <div className="flex flex-col h-full">
        <Header title="병원 상세" />
        <div className="flex-1 p-6 flex items-center justify-center">
          <div className="text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-muted-foreground">병원을 찾을 수 없습니다</p>
            <Link href="/dashboard/hospitals">
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
      <Header title="병원 상세" />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard/hospitals"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              병원 목록으로 돌아가기
            </Link>
            <div className="flex gap-2">
              <Link href={`/dashboard/hospitals/${hospital.id}/edit`}>
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
                        <Building2 className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{hospital.name}</CardTitle>
                        <p className="text-muted-foreground mt-1">
                          {hospital.businessNumber}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(hospital.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">주소</p>
                        <p className="text-muted-foreground">
                          {hospital.address}
                          {hospital.addressDetail && <br />}
                          {hospital.addressDetail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">전화번호</p>
                        <p className="text-muted-foreground">
                          {formatPhoneNumber(hospital.phone)}
                        </p>
                      </div>
                    </div>

                    {hospital.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="font-medium">이메일</p>
                          <p className="text-muted-foreground">{hospital.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Staff List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    직원 목록
                  </CardTitle>
                  <Button size="sm" variant="outline">
                    직원 추가
                  </Button>
                </CardHeader>
                <CardContent>
                  {!hospital.staff || hospital.staff.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      등록된 직원이 없습니다
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {hospital.staff.map((staff) => (
                        <div
                          key={staff.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary">
                                {staff.name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{staff.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {staff.email}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{getRoleLabel(staff.role)}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <span className="text-blue-900">직원 수</span>
                      </div>
                      <span className="font-bold text-blue-600">
                        {hospital._count?.staff || 0}명
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <PawPrint className="h-5 w-5 text-green-600" />
                        <span className="text-green-900">등록 환자</span>
                      </div>
                      <span className="font-bold text-green-600">
                        {hospital._count?.animals || 0}마리
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        <span className="text-purple-900">진료 기록</span>
                      </div>
                      <span className="font-bold text-purple-600">
                        {hospital._count?.medicalRecords || 0}건
                      </span>
                    </div>
                  </div>
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
                      <span>{formatDate(hospital.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">최종 수정</span>
                      <span>{formatDate(hospital.updatedAt)}</span>
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
