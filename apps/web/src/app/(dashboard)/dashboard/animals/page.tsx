'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, PawPrint, AlertCircle, RefreshCw } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge, NativeSelect } from '@/components/ui';
import { animalsApi } from '@/lib/api';
import { getSpeciesLabel, getGenderLabel, calculateAge, formatDate } from '@/lib/utils';
import { AxiosError } from 'axios';

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
    <div className="flex flex-col h-full">
      <Header title="동물 관리" />

      <div className="flex-1 p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="이름, 코드, 품종, 보호자로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              value={speciesFilter}
              onChange={(e) => setSpeciesFilter(e.target.value)}
              className="w-40"
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
          <Link href="/dashboard/animals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              동물 등록
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
                <Button variant="outline" size="sm" onClick={fetchAnimals}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Animals List */}
        {!error && isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error && filteredAnimals.length === 0 ? (
          <div className="text-center py-12">
            <PawPrint className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              등록된 동물이 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              첫 번째 동물을 등록해 보세요
            </p>
            <Link href="/dashboard/animals/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                동물 등록하기
              </Button>
            </Link>
          </div>
        ) : !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAnimals.map((animal) => (
              <Link key={animal.id} href={`/dashboard/animals/${animal.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <PawPrint className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{animal.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {animal.animalCode}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {getSpeciesLabel(animal.species)}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">품종</span>
                        <span>{animal.breed || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">성별</span>
                        <span>{getGenderLabel(animal.gender)}</span>
                      </div>
                      {animal.birthDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">나이</span>
                          <span>{calculateAge(animal.birthDate)}</span>
                        </div>
                      )}
                      {animal.weight && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">체중</span>
                          <span>{animal.weight} kg</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">보호자</span>
                        <span>{animal.owner?.name || '-'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                      <span>등록일: {formatDate(animal.createdAt)}</span>
                      {animal.isNeutered && (
                        <Badge variant="outline">중성화</Badge>
                      )}
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
