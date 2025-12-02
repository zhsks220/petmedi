'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge, NativeSelect } from '@/components/ui';
import { medicalRecordsApi } from '@/lib/api';
import { getVisitTypeLabel, formatDateTime } from '@/lib/utils';
import { AxiosError } from 'axios';

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
    <div className="flex flex-col h-full">
      <Header title="진료 기록" />

      <div className="flex-1 p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="환자명, 코드, 증상으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              value={visitTypeFilter}
              onChange={(e) => setVisitTypeFilter(e.target.value)}
              className="w-40"
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
          <Link href="/dashboard/medical-records/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              진료 기록 작성
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
                <Button variant="outline" size="sm" onClick={fetchRecords}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Records List */}
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
        ) : !error && filteredRecords.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              진료 기록이 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 진료 기록을 작성해 보세요
            </p>
            <Link href="/dashboard/medical-records/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                진료 기록 작성하기
              </Button>
            </Link>
          </div>
        ) : !error ? (
          <div className="space-y-4">
            {filteredRecords.map((record) => (
              <Link key={record.id} href={`/dashboard/medical-records/${record.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={getVisitTypeBadgeVariant(record.visitType)}>
                            {getVisitTypeLabel(record.visitType)}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(record.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mb-3">
                          <div>
                            <p className="font-semibold text-lg">
                              {record.animal.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {record.animal.animalCode}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="text-muted-foreground">주요 증상: </span>
                            {record.chiefComplaint}
                          </p>
                          {record.diagnosis && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">진단: </span>
                              {record.diagnosis}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">{record.hospital.name}</p>
                        {record.veterinarian && (
                          <p className="text-muted-foreground">
                            담당: {record.veterinarian.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
