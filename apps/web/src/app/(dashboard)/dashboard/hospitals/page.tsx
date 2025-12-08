'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2, MapPin, Phone, Mail, AlertCircle, RefreshCw, Filter, MoreHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Input, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { hospitalsApi } from '@/lib/api';
import { formatPhoneNumber, formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Hospital {
  id: string;
  name: string;
  businessNumber: string;
  address: string;
  addressDetail?: string;
  phone: string;
  email?: string;
  status: string;
  createdAt: string;
  _count?: {
    staff: number;
    animals: number;
  };
}

export default function HospitalsPage() {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchHospitals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await hospitalsApi.getAll();
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setHospitals(data);
      setFilteredHospitals(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '병원 목록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch hospitals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      setFilteredHospitals(
        hospitals.filter(
          (hospital) =>
            hospital.name.toLowerCase().includes(term) ||
            hospital.address.toLowerCase().includes(term) ||
            hospital.businessNumber.includes(term)
        )
      );
    } else {
      setFilteredHospitals(hospitals);
    }
  }, [searchTerm, hospitals]);

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

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="병원 관리"
        description="등록된 동물병원을 관리하고 현황을 조회합니다"
        icon={Building2}
      >
        <Link href="/dashboard/hospitals/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            병원 등록
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {/* Actions Bar */}
          <FadeIn className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="병원명, 주소, 사업자번호 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                필터
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchHospitals}>
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
                <Button variant="ghost" size="sm" onClick={fetchHospitals} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  다시 시도
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Hospitals Table */}
          <SlideUp className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[300px]">병원 정보</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>연락처</TableHead>
                  <TableHead>주소</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-10 w-48 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-6 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredHospitals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Building2 className="h-8 w-8 mb-2 text-slate-300" />
                        <p>등록된 병원이 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHospitals.map((hospital) => (
                    <TableRow
                      key={hospital.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/dashboard/hospitals/${hospital.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{hospital.name}</p>
                            <p className="text-xs text-slate-500">{hospital.businessNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(hospital.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {formatPhoneNumber(hospital.phone)}
                          </div>
                          {hospital.email && (
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <Mail className="h-3 w-3" />
                              {hospital.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 max-w-[300px]">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {hospital.address} {hospital.addressDetail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {formatDate(hospital.createdAt)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/hospitals/${hospital.id}`)}>
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/hospitals/${hospital.id}/edit`)}>
                              수정하기
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
