'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Calendar, Clock, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Filter, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Input, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, NativeSelect, Card, CardContent } from '@/components/ui';
import { appointmentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

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
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED: 'bg-green-50 text-green-700 border-green-200',
  CHECKED_IN: 'bg-purple-50 text-purple-700 border-purple-200',
  IN_PROGRESS: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  COMPLETED: 'bg-slate-50 text-slate-700 border-slate-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  NO_SHOW: 'bg-orange-50 text-orange-700 border-orange-200',
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
  const router = useRouter();
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
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="예약 관리"
        description="진료 예약을 관리하고 일정을 확인합니다"
        icon={Calendar}
      >
        <Link href="/dashboard/appointments/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            예약 등록
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {/* Date Navigation & Filters */}
          <FadeIn className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button variant="outline" size="icon" onClick={() => navigateDate(-1)} className="h-9 w-9">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 border border-slate-200 rounded-md px-3 py-1.5 h-9 bg-slate-50">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium min-w-[140px] text-center">
                  {selectedDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={() => navigateDate(1)} className="h-9 w-9">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs h-9">
                오늘
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 max-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder="검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <NativeSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-[120px] h-9 text-sm"
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
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchAppointments}>
                <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </FadeIn>

          {/* Error State */}
          {error && (
            <FadeIn>
              <div className="p-4 rounded-lg border border-red-100 bg-red-50 text-red-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchAppointments} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  다시 시도
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Appointments Table */}
          <SlideUp className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[120px]">시간</TableHead>
                  <TableHead className="w-[200px]">환자 정보</TableHead>
                  <TableHead>진료 내용</TableHead>
                  <TableHead>보호자</TableHead>
                  <TableHead>담당의</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-6 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-6 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Calendar className="h-8 w-8 mb-2 text-slate-300" />
                        <p>예약 내역이 없습니다</p>
                        <p className="text-xs text-slate-400 mt-1">{selectedDate.toLocaleDateString('ko-KR')}에 예정된 진료가 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((appointment) => (
                      <TableRow
                        key={appointment.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}
                      >
                        <TableCell className="align-top py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 text-base">{appointment.startTime}</span>
                            {appointment.endTime && (
                              <span className="text-xs text-slate-400">~ {appointment.endTime}</span>
                            )}
                            <span className="text-[10px] text-slate-400 mt-0.5 bg-slate-100 px-1 rounded w-fit">{appointment.duration}분</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium text-slate-900">{appointment.animal.name}</div>
                            <div className="text-xs text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded w-fit">{appointment.animal.animalCode}</div>
                            <span className="text-xs text-slate-500">{appointment.animal.species}</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <div className="flex flex-col gap-1">
                            <Badge variant="secondary" className="w-fit font-normal text-xs">
                              {typeLabels[appointment.type] || appointment.type}
                            </Badge>
                            {appointment.reason && (
                              <span className="text-xs text-slate-500 line-clamp-2 max-w-[200px]" title={appointment.reason}>
                                {appointment.reason}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <div className="flex flex-col">
                            <span className="text-sm text-slate-700">{appointment.guardian.name}</span>
                            <span className="text-xs text-slate-400">{appointment.guardian.phone || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <span className="text-sm text-slate-600">{appointment.vet?.name || '-'}</span>
                        </TableCell>
                        <TableCell className="align-top py-3">
                          <Badge className={`font-medium border ${statusColors[appointment.status] || 'bg-slate-100 text-slate-800'}`}>
                            {statusLabels[appointment.status] || appointment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top py-3" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}>
                                상세 보기
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/appointments/${appointment.id}/edit`)}>
                                예약 수정
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'CANCELLED')} className="text-red-600">
                                예약 취소
                              </DropdownMenuItem>
                              {appointment.status === 'SCHEDULED' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'CONFIRMED')} className="text-green-600">
                                  예약 확정
                                </DropdownMenuItem>
                              )}
                              {appointment.status === 'CONFIRMED' && (
                                <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'CHECKED_IN')} className="text-blue-600">
                                  내원 확인
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </SlideUp>

          {/* Summary Stats */}
          {!isLoading && !error && appointments.length > 0 && (
            <SlideUp delay={0.2} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {Object.entries(statusLabels).map(([status, label]) => {
                const count = appointments.filter((a) => a.status === status).length;
                return (
                  <Card key={status} className="text-center shadow-sm border-slate-200">
                    <CardContent className="p-3">
                      <div className={`text-xl font-bold ${count > 0 ? (statusColors[status]?.split(' ')[1] ?? 'text-slate-900') : 'text-slate-300'}`}>
                        {count}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </SlideUp>
          )}

        </StaggerContainer>
      </div>
    </div>
  );
}
