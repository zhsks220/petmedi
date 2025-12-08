'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, FileText, AlertCircle, RefreshCw, Filter, MoreHorizontal, Stethoscope } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Input, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, NativeSelect } from '@/components/ui';
import { medicalRecordsApi } from '@/lib/api';
import { getVisitTypeLabel, formatDateTime } from '@/lib/utils';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface MedicalRecord {
  id: string;
  visitType: string;
  chiefComplaint: string;
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  animal: {
    id: string;
    name: string;
    animalCode: string;
  };
  hospital: {
    id: string;
    name: string;
  };
  veterinarian?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export default function MedicalRecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 공유된 진료 기록 가져오기 (보호자/병원 모두 접근 가능)
      const response = await medicalRecordsApi.getShared();
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setRecords(data);
      setFilteredRecords(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '진료 기록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch medical records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    let filtered = records;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.animal.name.toLowerCase().includes(term) ||
          record.animal.animalCode.toLowerCase().includes(term) ||
          record.chiefComplaint.toLowerCase().includes(term) ||
          record.diagnosis?.toLowerCase().includes(term)
      );
    }

    if (visitTypeFilter) {
      filtered = filtered.filter((record) => record.visitType === visitTypeFilter);
    }

    setFilteredRecords(filtered);
  }, [searchTerm, visitTypeFilter, records]);

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
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="진료 기록"
        description="환자의 진료 이력 및 의료 기록을 관리합니다"
        icon={FileText}
      >
        <Link href="/dashboard/medical-records/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            진료 기록 작성
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {/* Actions Bar */}
          <FadeIn className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-1 gap-4 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder="환자명, 코드, 증상 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <NativeSelect
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
                className="w-32 sm:w-40 h-9"
              >
                <option value="">모든 유형</option>
                <option value="FIRST_VISIT">초진</option>
                <option value="REVISIT">재진</option>
                <option value="VACCINATION">예방접종</option>
                <option value="SURGERY">수술</option>
                <option value="HEALTH_CHECK">건강검진</option>
                <option value="EMERGENCY">응급</option>
                <option value="GROOMING">미용</option>
                <option value="OTHER">기타</option>
              </NativeSelect>
            </div>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchRecords}>
              <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </FadeIn>

          {/* Error State */}
          {error && (
            <FadeIn>
              <div className="p-4 rounded-lg border border-red-100 bg-red-50 text-red-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchRecords} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  다시 시도
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Records Table */}
          <SlideUp className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[180px]">진료 일시</TableHead>
                  <TableHead className="w-[100px]">유형</TableHead>
                  <TableHead className="w-[200px]">환자 정보</TableHead>
                  <TableHead>증상 및 진단</TableHead>
                  <TableHead>의료진/병원</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-6 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-48 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileText className="h-8 w-8 mb-2 text-slate-300" />
                        <p>진료 기록이 없습니다</p>
                        <p className="text-xs text-slate-400 mt-1">검색 조건에 맞는 진료 기록을 찾을 수 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/dashboard/medical-records/${record.id}`)}
                    >
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-900">
                            {formatDateTime(record.createdAt).split(' ')[0]}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(record.createdAt).split(' ')[1]} {formatDateTime(record.createdAt).split(' ')[2]}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <Badge variant={getVisitTypeBadgeVariant(record.visitType)} className="font-normal w-fit">
                          {getVisitTypeLabel(record.visitType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-slate-900">{record.animal.name}</span>
                          <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1 py-0.5 rounded w-fit">
                            {record.animal.animalCode}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col gap-1.5 max-w-md">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-slate-500 min-w-[30px] mt-0.5">증상</span>
                            <span className="text-sm text-slate-700 line-clamp-1">{record.chiefComplaint}</span>
                          </div>
                          {record.diagnosis && (
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-semibold text-blue-600 min-w-[30px] mt-0.5">진단</span>
                              <span className="text-sm text-slate-900 font-medium line-clamp-1">{record.diagnosis}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-700">{record.hospital.name}</span>
                          {record.veterinarian && (
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <Stethoscope className="h-3 w-3" />
                              {record.veterinarian.name}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top py-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/medical-records/${record.id}`)}>
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/medical-records/${record.id}/edit`)}>
                              내용 수정
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              처방전 인쇄
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SlideUp>
        </StaggerContainer>
      </div>
    </div>
  );
}
