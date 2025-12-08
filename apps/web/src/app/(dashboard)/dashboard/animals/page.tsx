'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, PawPrint, AlertCircle, RefreshCw, Filter, MoreHorizontal, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Input, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, NativeSelect } from '@/components/ui';
import { animalsApi } from '@/lib/api';
import { getSpeciesLabel, getGenderLabel, calculateAge, formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Animal {
  id: string;
  animalCode: string;
  name: string;
  species: string;
  breed?: string;
  birthDate?: string;
  gender: string;
  weight?: number;
  isNeutered: boolean;
  owner?: { name: string };
  hospital?: { name: string };
  createdAt: string;
}

export default function AnimalsPage() {
  const router = useRouter();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [speciesFilter, setSpeciesFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchAnimals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await animalsApi.getMy();
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setAnimals(data);
      setFilteredAnimals(data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '동물 목록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch animals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimals();
  }, []);

  useEffect(() => {
    let filtered = animals;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (animal) =>
          animal.name.toLowerCase().includes(term) ||
          animal.animalCode.toLowerCase().includes(term) ||
          animal.breed?.toLowerCase().includes(term) ||
          animal.owner?.name.toLowerCase().includes(term)
      );
    }

    if (speciesFilter) {
      filtered = filtered.filter((animal) => animal.species === speciesFilter);
    }

    setFilteredAnimals(filtered);
  }, [searchTerm, speciesFilter, animals]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="동물 관리"
        description="등록된 환자(동물) 정보를 관리하고 진료 내역을 확인합니다"
        icon={PawPrint}
      >
        <Link href="/dashboard/animals/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            동물 등록
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
                  placeholder="이름, 코드, 품종, 보호자 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <NativeSelect
                value={speciesFilter}
                onChange={(e) => setSpeciesFilter(e.target.value)}
                className="w-32 sm:w-40 h-9"
              >
                <option value="">모든 종류</option>
                <option value="DOG">강아지</option>
                <option value="CAT">고양이</option>
                <option value="BIRD">조류</option>
                <option value="RABBIT">토끼</option>
                <option value="HAMSTER">햄스터</option>
                <option value="REPTILE">파충류</option>
                <option value="OTHER">기타</option>
              </NativeSelect>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchAnimals}>
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
                <Button variant="ghost" size="sm" onClick={fetchAnimals} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  다시 시도
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Animals Table */}
          <SlideUp className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[300px]">환자 정보</TableHead>
                  <TableHead>품종/성별</TableHead>
                  <TableHead>나이/체중</TableHead>
                  <TableHead>보호자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-10 w-48 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-6 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredAnimals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <PawPrint className="h-8 w-8 mb-2 text-slate-300" />
                        <p>등록된 동물이 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAnimals.map((animal) => (
                    <TableRow
                      key={animal.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/dashboard/animals/${animal.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                            <PawPrint className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{animal.name}</span>
                              <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{animal.animalCode}</span>
                            </div>
                            <span className="text-xs text-slate-500">{getSpeciesLabel(animal.species)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="text-slate-700">{animal.breed || '-'}</span>
                          <span className="text-xs text-slate-500">{getGenderLabel(animal.gender)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="text-slate-700">{animal.birthDate ? calculateAge(animal.birthDate) : '-'}</span>
                          {animal.weight && <span className="text-xs text-slate-500">{animal.weight}kg</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <User className="h-3 w-3 text-slate-400" />
                          {animal.owner?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {animal.isNeutered && (
                          <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-300">
                            중성화
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/animals/${animal.id}`)}>
                              상세 보기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/animals/${animal.id}/edit`)}>
                              수정하기
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/medical-records/new?animalId=${animal.id}`)}>
                              진료 기록 추가
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
