'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, ArrowLeft, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, NativeSelect, Textarea } from '@/components/ui';
import { appointmentsApi, animalsApi, hospitalsApi, usersApi } from '@/lib/api';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Animal {
  id: string;
  name: string;
  species: string;
  animalCode: string;
  owner?: { name: string };
}

interface Hospital {
  id: string;
  name: string;
  species: string;
  animalCode: string;
  owner?: { name: string };
}

interface Hospital {
  id: string;
  name: string;
}

interface Vet {
  id: string;
  name: string;
}

interface AvailableSlot {
  time: string;
  available: boolean;
}

interface AppointmentFormData {
  hospitalId: string;
  animalId: string;
  vetId: string;
  appointmentDate: string;
  startTime: string;
  duration: number;
  type: string;
  reason: string;
  symptoms: string;
  notes: string;
}

const appointmentTypes = [
  { value: 'CONSULTATION', label: '일반 진료' },
  { value: 'VACCINATION', label: '예방접종' },
  { value: 'SURGERY', label: '수술' },
  { value: 'CHECKUP', label: '건강검진' },
  { value: 'GROOMING', label: '미용' },
  { value: 'FOLLOW_UP', label: '재진' },
  { value: 'EMERGENCY', label: '응급' },
  { value: 'OTHER', label: '기타' },
];

export default function NewAppointmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search states
  const [animalSearch, setAnimalSearch] = useState('');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<Animal[]>([]);
  const [showAnimalDropdown, setShowAnimalDropdown] = useState(false);

  // Data states
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [vets, setVets] = useState<Vet[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Form states
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [formData, setFormData] = useState<AppointmentFormData>({
    hospitalId: '',
    animalId: '',
    vetId: '',
    appointmentDate: new Date().toISOString().split('T')[0] as string,
    startTime: '',
    duration: 30,
    type: 'CONSULTATION',
    reason: '',
    symptoms: '',
    notes: '',
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animalsRes, hospitalsRes] = await Promise.all([
          animalsApi.getMy(),
          hospitalsApi.getMy(),
        ]);

        const animalsData = Array.isArray(animalsRes.data) ? animalsRes.data : animalsRes.data?.data || [];
        setAnimals(animalsData);
        setFilteredAnimals(animalsData);

        const hospitalsData = Array.isArray(hospitalsRes.data) ? hospitalsRes.data : [hospitalsRes.data];
        setHospitals(hospitalsData.filter(Boolean));

        // Auto-select first hospital if only one
        if (hospitalsData.length === 1 && hospitalsData[0]) {
          setFormData((prev) => ({ ...prev, hospitalId: hospitalsData[0].id }));
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };

    fetchData();
  }, []);

  // Fetch vets when hospital changes
  useEffect(() => {
    const fetchVets = async () => {
      if (!formData.hospitalId) {
        setVets([]);
        return;
      }
      try {
        const response = await usersApi.getAll({ page: 1, limit: 100 });
        const data = response.data?.data || [];
        // Filter vets (users with VET role)
        const vetUsers = data.filter((u: { role: string }) => u.role === 'VET');
        setVets(vetUsers);
      } catch (err) {
        console.error('Failed to fetch vets:', err);
      }
    };

    fetchVets();
  }, [formData.hospitalId]);

  // Fetch available slots when date or hospital changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!formData.hospitalId || !formData.appointmentDate) {
        setAvailableSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      try {
        const response = await appointmentsApi.getAvailableSlots({
          hospitalId: formData.hospitalId,
          date: formData.appointmentDate,
        });
        setAvailableSlots(response.data || []);
      } catch (err) {
        console.error('Failed to fetch slots:', err);
        setAvailableSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [formData.hospitalId, formData.appointmentDate]);

  // Filter animals by search term
  useEffect(() => {
    if (!animalSearch) {
      setFilteredAnimals(animals);
      return;
    }

    const term = animalSearch.toLowerCase();
    const filtered = animals.filter(
      (animal) =>
        animal.name.toLowerCase().includes(term) ||
        animal.animalCode.toLowerCase().includes(term) ||
        animal.owner?.name.toLowerCase().includes(term)
    );
    setFilteredAnimals(filtered);
  }, [animalSearch, animals]);

  const handleAnimalSelect = (animal: Animal) => {
    setSelectedAnimal(animal);
    setFormData((prev) => ({ ...prev, animalId: animal.id }));
    setAnimalSearch(animal.name);
    setShowAnimalDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.animalId) {
      setError('환자를 선택해주세요.');
      return;
    }
    if (!formData.hospitalId) {
      setError('병원을 선택해주세요.');
      return;
    }
    if (!formData.startTime) {
      setError('예약 시간을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const createData: {
        hospitalId: string;
        animalId: string;
        appointmentDate: string;
        startTime: string;
        duration: number;
        type: string;
        vetId?: string;
        reason?: string;
        symptoms?: string;
        notes?: string;
      } = {
        hospitalId: formData.hospitalId,
        animalId: formData.animalId,
        appointmentDate: formData.appointmentDate,
        startTime: formData.startTime,
        duration: formData.duration,
        type: formData.type,
      };

      if (formData.vetId) createData.vetId = formData.vetId;
      if (formData.reason) createData.reason = formData.reason;
      if (formData.symptoms) createData.symptoms = formData.symptoms;
      if (formData.notes) createData.notes = formData.notes;

      await appointmentsApi.create(createData);

      router.push('/dashboard/appointments');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '예약 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="새 예약 등록" />

      <StaggerContainer className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <Button
              variant="outline"
              className="mb-6"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              뒤로 가기
            </Button>
          </FadeIn>

          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  {/* Patient Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      환자 선택 <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="환자 이름, 코드, 보호자명으로 검색..."
                        value={animalSearch}
                        onChange={(e) => {
                          setAnimalSearch(e.target.value);
                          setShowAnimalDropdown(true);
                        }}
                        onFocus={() => setShowAnimalDropdown(true)}
                        className="pl-9"
                      />
                      {showAnimalDropdown && filteredAnimals.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredAnimals.map((animal) => (
                            <button
                              key={animal.id}
                              type="button"
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                              onClick={() => handleAnimalSelect(animal)}
                            >
                              <div className="font-medium">{animal.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {animal.animalCode} · {animal.owner?.name || '보호자 미등록'}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedAnimal && (
                      <div className="p-3 bg-primary/5 rounded-lg">
                        <div className="font-medium">{selectedAnimal.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {selectedAnimal.animalCode} · 보호자: {selectedAnimal.owner?.name || '미등록'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hospital Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      병원 <span className="text-destructive">*</span>
                    </label>
                    <NativeSelect
                      value={formData.hospitalId}
                      onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                      required
                    >
                      <option value="">병원 선택</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        예약 날짜 <span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="date"
                        value={formData.appointmentDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium">
                        <Clock className="inline h-4 w-4 mr-1" />
                        소요 시간
                      </label>
                      <NativeSelect
                        value={formData.duration.toString()}
                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                      >
                        <option value="15">15분</option>
                        <option value="30">30분</option>
                        <option value="45">45분</option>
                        <option value="60">60분</option>
                        <option value="90">90분</option>
                        <option value="120">120분</option>
                      </NativeSelect>
                    </div>
                  </div>

                  {/* Available Time Slots */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      예약 시간 <span className="text-destructive">*</span>
                    </label>
                    {isLoadingSlots ? (
                      <div className="p-4 text-center text-muted-foreground">
                        가능한 시간을 확인하는 중...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground bg-gray-50 rounded-lg">
                        {formData.hospitalId
                          ? '해당 날짜에 예약 가능한 시간이 없습니다.'
                          : '병원을 먼저 선택해주세요.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {availableSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            type="button"
                            variant={formData.startTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            disabled={!slot.available}
                            className={!slot.available ? 'opacity-50 cursor-not-allowed' : ''}
                            onClick={() => setFormData({ ...formData, startTime: slot.time })}
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Vet Selection */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">담당 수의사</label>
                    <NativeSelect
                      value={formData.vetId}
                      onChange={(e) => setFormData({ ...formData, vetId: e.target.value })}
                    >
                      <option value="">담당의 미지정</option>
                      {vets.map((vet) => (
                        <option key={vet.id} value={vet.id}>
                          {vet.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  {/* Appointment Type */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">예약 유형</label>
                    <NativeSelect
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    >
                      {appointmentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">방문 사유</label>
                    <Input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="예: 정기 건강검진, 예방접종 등"
                    />
                  </div>

                  {/* Symptoms */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">증상 설명</label>
                    <Textarea
                      value={formData.symptoms}
                      onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                      placeholder="증상이 있다면 자세히 설명해주세요..."
                      rows={3}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">메모</label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="추가 메모 사항..."
                      rows={2}
                    />
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      disabled={isSubmitting}
                    >
                      취소
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? '등록 중...' : '예약 등록'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </SlideUp>
        </div>
      </StaggerContainer>
    </div>
  );
}
