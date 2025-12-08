'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Building2, MapPin, Phone, Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge } from '@/components/ui';
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
    <div className="flex flex-col h-full">
      <Header title="병원 관리" />

      <StaggerContainer className="flex-1 p-6 space-y-6">
        {/* Actions Bar */}
        <FadeIn className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="병원명, 주소, 사업자번호로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Link href="/dashboard/hospitals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              병원 등록
            </Button>
          </Link>
        </FadeIn>

        {/* Error State */}
        {error && (
          <FadeIn>
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
                  <Button variant="outline" size="sm" onClick={fetchHospitals}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    다시 시도
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* Hospitals List */}
        {!error && isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-gray-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error && filteredHospitals.length === 0 ? (
          <FadeIn className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              등록된 병원이 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 병원을 등록해 보세요
            </p>
            <Link href="/dashboard/hospitals/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                병원 등록하기
              </Button>
            </Link>
          </FadeIn>
        ) : !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHospitals.map((hospital) => (
              <SlideUp key={hospital.id}>
                <Link href={`/dashboard/hospitals/${hospital.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{hospital.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {hospital.businessNumber}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(hospital.status)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            {hospital.address}
                            {hospital.addressDetail && ` ${hospital.addressDetail}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{formatPhoneNumber(hospital.phone)}</span>
                        </div>
                        {hospital.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{hospital.email}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t flex justify-between text-xs text-muted-foreground">
                        <span>등록일: {formatDate(hospital.createdAt)}</span>
                        {hospital._count && (
                          <span>
                            직원 {hospital._count.staff}명 · 환자{' '}
                            {hospital._count.animals}마리
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </SlideUp>
            ))}
          </div>
        ) : null}
      </StaggerContainer>
    </div>
  );
}
