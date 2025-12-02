'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Calendar, Clock, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge, NativeSelect } from '@/components/ui';
import { appointmentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';

interface Appointment {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime?: string;
  duration: number;
  type: string;
  status: string;
  reason?: string;
  symptoms?: string;
  animal: {
    id: string;
    name: string;
    species: string;
    animalCode: string;
  };
  guardian: {
    id: string;
    name: string;
    phone?: string;
  };
  vet?: {
    id: string;
    name: string;
  };
  hospital: {
    id: string;
    name: string;
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

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDateForApi = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await appointmentsApi.getAll({
        startDate: formatDateForApi(selectedDate),
        endDate: formatDateForApi(selectedDate),
        ...(statusFilter && { status: statusFilter }),
      });
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAppointments(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '예약 목록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch appointments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = appointments.filter((appointment) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      appointment.animal.name.toLowerCase().includes(term) ||
      appointment.animal.animalCode.toLowerCase().includes(term) ||
      appointment.guardian.name.toLowerCase().includes(term) ||
      appointment.vet?.name.toLowerCase().includes(term)
    );
  });

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await appointmentsApi.updateStatus(appointmentId, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      console.error('Failed to update status:', err);
      setError('상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="예약 관리" />

      <div className="flex-1 p-6 space-y-6">
        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm">
          <Button variant="outline" size="sm" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">
              {selectedDate.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </h2>
            <Button variant="outline" size="sm" onClick={goToToday}>
              오늘
            </Button>
            <Input
              type="date"
              value={formatDateForApi(selectedDate)}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-40"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="환자명, 코드, 보호자명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">모든 상태</option>
              <option value="SCHEDULED">예약됨</option>
              <option value="CONFIRMED">확정</option>
              <option value="CHECKED_IN">내원 완료</option>
              <option value="IN_PROGRESS">진료 중</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
              <option value="NO_SHOW">미방문</option>
            </NativeSelect>
          </div>
          <Link href="/dashboard/appointments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              예약 등록
            </Button>
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">오류 발생</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchAppointments}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appointments List */}
        {!error && isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error && filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              예약이 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              {selectedDate.toLocaleDateString('ko-KR')}에 예약된 진료가 없습니다
            </p>
            <Link href="/dashboard/appointments/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                예약 등록하기
              </Button>
            </Link>
          </div>
        ) : !error ? (
          <div className="space-y-4">
            {filteredAppointments
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        {/* Time */}
                        <div className="text-center min-w-[80px]">
                          <div className="flex items-center gap-1 text-lg font-semibold">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {appointment.startTime}
                          </div>
                          {appointment.endTime && (
                            <div className="text-sm text-muted-foreground">
                              ~ {appointment.endTime}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {appointment.duration}분
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="h-16 w-px bg-gray-200" />

                        {/* Patient Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{appointment.animal.name}</h3>
                            <Badge variant="secondary">
                              {typeLabels[appointment.type] || appointment.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {appointment.animal.animalCode} · 보호자: {appointment.guardian.name}
                            {appointment.guardian.phone && ` (${appointment.guardian.phone})`}
                          </p>
                          {appointment.reason && (
                            <p className="text-sm mt-1">
                              <span className="text-muted-foreground">방문 사유:</span> {appointment.reason}
                            </p>
                          )}
                          {appointment.vet && (
                            <p className="text-sm text-muted-foreground">
                              담당 수의사: {appointment.vet.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[appointment.status]}`}>
                          {statusLabels[appointment.status] || appointment.status}
                        </span>

                        {/* Quick Actions */}
                        {appointment.status === 'SCHEDULED' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(appointment.id, 'CONFIRMED')}
                            >
                              확정
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(appointment.id, 'CANCELLED')}
                            >
                              취소
                            </Button>
                          </div>
                        )}
                        {appointment.status === 'CONFIRMED' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(appointment.id, 'CHECKED_IN')}
                          >
                            내원 확인
                          </Button>
                        )}
                        {appointment.status === 'CHECKED_IN' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(appointment.id, 'IN_PROGRESS')}
                          >
                            진료 시작
                          </Button>
                        )}
                        {appointment.status === 'IN_PROGRESS' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(appointment.id, 'COMPLETED')}
                          >
                            진료 완료
                          </Button>
                        )}

                        <Link href={`/dashboard/appointments/${appointment.id}`}>
                          <Button variant="outline" size="sm">
                            상세보기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : null}

        {/* Summary Stats */}
        {!isLoading && !error && appointments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-6">
            {Object.entries(statusLabels).map(([status, label]) => {
              const count = appointments.filter((a) => a.status === status).length;
              return (
                <Card key={status} className="text-center">
                  <CardContent className="p-4">
                    <div className={`text-2xl font-bold ${count > 0 ? (statusColors[status]?.split(' ')[1] ?? 'text-gray-800') : 'text-gray-400'}`}>
                      {count}
                    </div>
                    <div className="text-sm text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
