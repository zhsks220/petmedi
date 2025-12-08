'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, User, Building, PawPrint, Phone, FileText, AlertCircle, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Card, CardContent, Badge, Textarea } from '@/components/ui';
import { appointmentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface AppointmentDetail {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  duration: number;
  type: string;
  status: string;
  reason?: string;
  symptoms?: string;
  notes?: string;
  cancelReason?: string;
  checkedInAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  reminderSent: boolean;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
  animal: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    animalCode: string;
    gender: string;
    birthDate?: string;
  };
  guardian: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  vet?: {
    id: string;
    name: string;
    email?: string;
  };
  hospital: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
  };
}

const statusLabels: Record<string, string> = {
  SCHEDULED: '예약됨',
  CONFIRMED: '확정',
  CHECKED_IN: '내원 완료',
  IN_PROGRESS: '진료 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
  NO_SHOW: '미방문',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CHECKED_IN: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-orange-100 text-orange-800',
};

const typeLabels: Record<string, string> = {
  CONSULTATION: '일반 진료',
  VACCINATION: '예방접종',
  SURGERY: '수술',
  CHECKUP: '건강검진',
  GROOMING: '미용',
  FOLLOW_UP: '재진',
  EMERGENCY: '응급',
  OTHER: '기타',
};

const speciesLabels: Record<string, string> = {
  DOG: '강아지',
  CAT: '고양이',
  BIRD: '조류',
  RABBIT: '토끼',
  HAMSTER: '햄스터',
  REPTILE: '파충류',
  OTHER: '기타',
};

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAppointment = async () => {
    if (!params.id) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentsApi.getById(params.id as string);
      setAppointment(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '예약 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointment();
  }, [params.id]);

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    if (!appointment) return;

    setIsUpdating(true);
    try {
      await appointmentsApi.updateStatus(appointment.id, {
        status: newStatus,
        ...(reason && { cancelReason: reason }),
      });
      fetchAppointment();
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '상태 변경에 실패했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!appointment || !confirm('정말로 이 예약을 삭제하시겠습니까?')) return;

    try {
      await appointmentsApi.delete(appointment.id);
      router.push('/dashboard/appointments');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '예약 삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="예약 상세" />
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto animate-pulse space-y-6">
            <div className="h-8 w-32 bg-gray-200 rounded" />
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex flex-col h-full">
        <Header title="예약 상세" />
        <div className="flex-1 p-6">
          <div className="max-w-3xl mx-auto">
            <FadeIn>
              <Card className="border-destructive">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-destructive">오류 발생</p>
                      <p className="text-sm text-muted-foreground">{error || '예약을 찾을 수 없습니다.'}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    뒤로 가기
                  </Button>
                </CardContent>
              </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="예약 상세" />

      <StaggerContainer className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Back Button */}
          <FadeIn>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로 가기
            </Button>
          </FadeIn>

          {/* Status & Actions Header */}
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-full text-lg font-medium ${statusColors[appointment.status]}`}>
                      {statusLabels[appointment.status] || appointment.status}
                    </span>
                    <Badge variant="secondary">
                      {typeLabels[appointment.type] || appointment.type}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === 'SCHEDULED' && (
                      <>
                        <Button onClick={() => handleStatusChange('CONFIRMED')} disabled={isUpdating}>
                          확정
                        </Button>
                        <Button variant="destructive" onClick={() => setShowCancelDialog(true)} disabled={isUpdating}>
                          취소
                        </Button>
                      </>
                    )}
                    {appointment.status === 'CONFIRMED' && (
                      <>
                        <Button onClick={() => handleStatusChange('CHECKED_IN')} disabled={isUpdating}>
                          내원 확인
                        </Button>
                        <Button variant="outline" onClick={() => handleStatusChange('NO_SHOW')} disabled={isUpdating}>
                          미방문
                        </Button>
                      </>
                    )}
                    {appointment.status === 'CHECKED_IN' && (
                      <Button onClick={() => handleStatusChange('IN_PROGRESS')} disabled={isUpdating}>
                        진료 시작
                      </Button>
                    )}
                    {appointment.status === 'IN_PROGRESS' && (
                      <Button onClick={() => handleStatusChange('COMPLETED')} disabled={isUpdating}>
                        진료 완료
                      </Button>
                    )}
                    {['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && (
                      <Button variant="ghost" size="sm" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cancel Dialog */}
                {showCancelDialog && (
                  <div className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="font-medium mb-2">예약 취소 사유</p>
                    <Textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="취소 사유를 입력해주세요..."
                      rows={2}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => setShowCancelDialog(false)}>
                        취소
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleStatusChange('CANCELLED', cancelReason)}
                        disabled={isUpdating}
                      >
                        예약 취소 확인
                      </Button>
                    </div>
                  </div>
                )}

                {/* Cancel Reason Display */}
                {appointment.status === 'CANCELLED' && appointment.cancelReason && (
                  <div className="mt-4 p-4 bg-destructive/5 rounded-lg">
                    <p className="text-sm text-muted-foreground">취소 사유</p>
                    <p>{appointment.cancelReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>

          {/* Appointment Info */}
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  예약 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">예약 날짜</p>
                    <p className="font-medium">
                      {new Date(appointment.appointmentDate).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">예약 시간</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {appointment.startTime}
                      {appointment.endTime && ` ~ ${appointment.endTime}`}
                      <span className="text-muted-foreground">({appointment.duration}분)</span>
                    </p>
                  </div>
                  {appointment.reason && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">방문 사유</p>
                      <p className="font-medium">{appointment.reason}</p>
                    </div>
                  )}
                  {appointment.symptoms && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">증상</p>
                      <p className="whitespace-pre-wrap">{appointment.symptoms}</p>
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">메모</p>
                      <p className="whitespace-pre-wrap">{appointment.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Patient Info */}
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  환자 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">이름</p>
                    <Link href={`/dashboard/animals/${appointment.animal.id}`} className="font-medium text-primary hover:underline">
                      {appointment.animal.name}
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">코드</p>
                    <p className="font-medium">{appointment.animal.animalCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">종류</p>
                    <p className="font-medium">{speciesLabels[appointment.animal.species] || appointment.animal.species}</p>
                  </div>
                  {appointment.animal.breed && (
                    <div>
                      <p className="text-sm text-muted-foreground">품종</p>
                      <p className="font-medium">{appointment.animal.breed}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Guardian Info */}
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  보호자 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">이름</p>
                    <p className="font-medium">{appointment.guardian.name}</p>
                  </div>
                  {appointment.guardian.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">연락처</p>
                      <p className="font-medium flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {appointment.guardian.phone}
                      </p>
                    </div>
                  )}
                  {appointment.guardian.email && (
                    <div>
                      <p className="text-sm text-muted-foreground">이메일</p>
                      <p className="font-medium">{appointment.guardian.email}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Hospital & Vet Info */}
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  병원 정보
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">병원명</p>
                    <p className="font-medium">{appointment.hospital.name}</p>
                  </div>
                  {appointment.hospital.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">연락처</p>
                      <p className="font-medium">{appointment.hospital.phone}</p>
                    </div>
                  )}
                  {appointment.vet && (
                    <div>
                      <p className="text-sm text-muted-foreground">담당 수의사</p>
                      <p className="font-medium">{appointment.vet.name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Timeline */}
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  처리 이력
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">예약 생성</span>
                    <span>{formatDate(appointment.createdAt)}</span>
                  </div>
                  {appointment.checkedInAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">내원 확인</span>
                      <span>{formatDate(appointment.checkedInAt)}</span>
                    </div>
                  )}
                  {appointment.completedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">진료 완료</span>
                      <span>{formatDate(appointment.completedAt)}</span>
                    </div>
                  )}
                  {appointment.cancelledAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">예약 취소</span>
                      <span>{formatDate(appointment.cancelledAt)}</span>
                    </div>
                  )}
                  {appointment.reminderSent && appointment.reminderSentAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">알림 발송</span>
                      <span>{formatDate(appointment.reminderSentAt)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Quick Actions */}
          {appointment.status === 'COMPLETED' && (
            <SlideUp>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4">다음 단계</h3>
                  <div className="flex gap-4">
                    <Link href={`/dashboard/medical-records/new?animalId=${appointment.animal.id}&appointmentId=${appointment.id}`}>
                      <Button>진료 기록 작성</Button>
                    </Link>
                    <Link href={`/dashboard/appointments/new?animalId=${appointment.animal.id}`}>
                      <Button variant="outline">재진 예약</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          )}
        </div>
      </StaggerContainer>
    </div>
  );
}
