'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Card, CardContent, Input, NativeSelect, Textarea } from '@/components/ui';
import { invoicesApi, animalsApi, hospitalsApi } from '@/lib/api';
import { AxiosError } from 'axios';

interface InvoiceItem {
  id: string;
  type: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountRate: number;
  discountAmount: number;
}

interface Animal {
  id: string;
  name: string;
  species: string;
  animalCode: string;
  guardians?: Array<{
    guardian: {
      id: string;
      name: string;
      phone?: string;
    };
  }>;
}

interface Hospital {
  id: string;
  name: string;
}

const itemTypes = [
  { value: 'CONSULTATION', label: '진료비' },
  { value: 'SURGERY', label: '수술비' },
  { value: 'MEDICATION', label: '약제비' },
  { value: 'INJECTION', label: '주사비' },
  { value: 'LAB_TEST', label: '검사비' },
  { value: 'IMAGING', label: '영상검사' },
  { value: 'HOSPITALIZATION', label: '입원비' },
  { value: 'GROOMING', label: '미용비' },
  { value: 'VACCINATION', label: '예방접종' },
  { value: 'SUPPLIES', label: '용품' },
  { value: 'DISCOUNT', label: '할인' },
  { value: 'OTHER', label: '기타' },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

const generateTempId = () => Math.random().toString(36).substring(2, 9);

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const animalIdFromQuery = searchParams.get('animalId');
  const appointmentIdFromQuery = searchParams.get('appointmentId');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hospital selection
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');

  // Animal search
  const [animalSearchCode, setAnimalSearchCode] = useState('');
  const [isSearchingAnimal, setIsSearchingAnimal] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedGuardianId, setSelectedGuardianId] = useState('');

  // Invoice details
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: generateTempId(),
      type: 'CONSULTATION',
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discountRate: 0,
      discountAmount: 0,
    },
  ]);

  // Load hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await hospitalsApi.getMy();
        const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
        setHospitals(data);
        if (data.length === 1) {
          setSelectedHospitalId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch hospitals:', err);
      }
    };
    fetchHospitals();
  }, []);

  // Load animal if passed via query
  useEffect(() => {
    if (animalIdFromQuery) {
      const fetchAnimal = async () => {
        try {
          const response = await animalsApi.getById(animalIdFromQuery);
          setSelectedAnimal(response.data);
          if (response.data.guardians?.length > 0) {
            setSelectedGuardianId(response.data.guardians[0].guardian.id);
          }
        } catch (err) {
          console.error('Failed to fetch animal:', err);
        }
      };
      fetchAnimal();
    }
  }, [animalIdFromQuery]);

  const handleSearchAnimal = async () => {
    if (!animalSearchCode || !selectedHospitalId) return;

    setIsSearchingAnimal(true);
    setError(null);
    try {
      const response = await animalsApi.search(animalSearchCode, selectedHospitalId);
      const animals = response.data;
      if (animals && animals.length > 0) {
        setSelectedAnimal(animals[0]);
        if (animals[0].guardians?.length > 0) {
          setSelectedGuardianId(animals[0].guardians[0].guardian.id);
        }
      } else {
        setError('환자를 찾을 수 없습니다.');
      }
    } catch (err) {
      setError('환자 검색에 실패했습니다.');
    } finally {
      setIsSearchingAnimal(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateTempId(),
        type: 'OTHER',
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountRate: 0,
        discountAmount: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountFromRate = subtotal * (item.discountRate / 100);
    const totalDiscount = discountFromRate + item.discountAmount;
    return Math.max(0, subtotal - totalDiscount);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const totalDiscount = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + itemSubtotal * (item.discountRate / 100) + item.discountAmount;
    }, 0);
    const finalAmount = Math.max(0, subtotal - totalDiscount);
    return { subtotal, totalDiscount, finalAmount };
  };

  const handleSubmit = async (status: 'DRAFT' | 'PENDING') => {
    if (!selectedHospitalId || !selectedAnimal || !selectedGuardianId) {
      setError('병원, 환자, 보호자를 모두 선택해주세요.');
      return;
    }

    if (items.some((item) => !item.name || item.unitPrice <= 0)) {
      setError('모든 항목의 이름과 단가를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await invoicesApi.create({
        hospitalId: selectedHospitalId,
        animalId: selectedAnimal.id,
        guardianId: selectedGuardianId,
        appointmentId: appointmentIdFromQuery || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        internalNotes: internalNotes || undefined,
        items: items.map((item, index) => ({
          type: item.type,
          name: item.name,
          description: item.description || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountRate: item.discountRate || undefined,
          discountAmount: item.discountAmount || undefined,
          sortOrder: index,
        })),
      });

      // Update status if not draft
      if (status === 'PENDING') {
        await invoicesApi.update(response.data.id, { status: 'PENDING' });
      }

      router.push(`/dashboard/billing/${response.data.id}`);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '청구서 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="flex flex-col h-full">
      <Header title="청구서 작성" />

      <div className="flex-1 p-6 space-y-6">
        {/* Back Button */}
        <Link href="/dashboard/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </Link>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {error}
          </div>
        )}

        {/* Hospital Selection */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">병원 선택</h2>
            <NativeSelect
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="w-full max-w-md"
            >
              <option value="">병원을 선택하세요</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </NativeSelect>
          </CardContent>
        </Card>

        {/* Animal Search */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">환자 정보</h2>

            {selectedAnimal ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium text-lg">{selectedAnimal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedAnimal.animalCode} · {selectedAnimal.species}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAnimal(null);
                      setSelectedGuardianId('');
                    }}
                  >
                    다른 환자 선택
                  </Button>
                </div>

                {selectedAnimal.guardians && selectedAnimal.guardians.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium mb-2">보호자 선택</label>
                    <NativeSelect
                      value={selectedGuardianId}
                      onChange={(e) => setSelectedGuardianId(e.target.value)}
                      className="w-full max-w-md"
                    >
                      <option value="">보호자를 선택하세요</option>
                      {selectedAnimal.guardians.map((g) => (
                        <option key={g.guardian.id} value={g.guardian.id}>
                          {g.guardian.name} {g.guardian.phone && `(${g.guardian.phone})`}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-3 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="환자 코드로 검색"
                    value={animalSearchCode}
                    onChange={(e) => setAnimalSearchCode(e.target.value)}
                    className="pl-9"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchAnimal()}
                  />
                </div>
                <Button
                  onClick={handleSearchAnimal}
                  disabled={!selectedHospitalId || !animalSearchCode || isSearchingAnimal}
                >
                  {isSearchingAnimal ? '검색 중...' : '검색'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Items */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">청구 항목</h2>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                항목 추가
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      항목 {index + 1}
                    </span>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <NativeSelect
                      value={item.type}
                      onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                    >
                      {itemTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </NativeSelect>

                    <Input
                      placeholder="항목명"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                      className="md:col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">단가</label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">수량</label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                        }
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">할인율 (%)</label>
                      <Input
                        type="number"
                        value={item.discountRate}
                        onChange={(e) =>
                          updateItem(item.id, 'discountRate', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                        max={100}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">할인금액</label>
                      <Input
                        type="number"
                        value={item.discountAmount}
                        onChange={(e) =>
                          updateItem(item.id, 'discountAmount', parseFloat(e.target.value) || 0)
                        }
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">금액</label>
                      <div className="h-10 flex items-center font-medium">
                        {formatCurrency(calculateItemTotal(item))}
                      </div>
                    </div>
                  </div>

                  <Input
                    placeholder="상세 설명 (선택)"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">소계</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>할인</span>
                    <span>-{formatCurrency(totals.totalDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>총 금액</span>
                  <span>{formatCurrency(totals.finalAmount)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">추가 정보</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">결제 기한 (선택)</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">고객 메모 (선택)</label>
                <Textarea
                  placeholder="청구서에 표시될 메모"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">내부 메모 (선택)</label>
                <Textarea
                  placeholder="내부 관리용 메모 (고객에게 표시되지 않음)"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link href="/dashboard/billing">
            <Button variant="outline" disabled={isSubmitting}>
              취소
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => handleSubmit('DRAFT')}
            disabled={isSubmitting}
          >
            임시저장
          </Button>
          <Button
            onClick={() => handleSubmit('PENDING')}
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '청구서 발행'}
          </Button>
        </div>
      </div>
    </div>
  );
}
