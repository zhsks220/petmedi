'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Package } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, NativeSelect, Textarea } from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    type: 'MEDICATION',
    unit: '개',
    description: '',
    categoryId: '',
    supplierId: '',
    costPrice: '',
    sellingPrice: '',
    reorderPoint: '10',
    reorderQuantity: '20',
  });

  const fetchCategories = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getCategories(hospitalId);
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [hospitalId]);

  const fetchSuppliers = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getSuppliers(hospitalId);
      setSuppliers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, [fetchCategories, fetchSuppliers]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) {
      setError('병원 정보가 없습니다.');
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await inventoryApi.createProduct({
        hospitalId,
        name: formData.name,
        barcode: formData.barcode || undefined,
        type: formData.type,
        unit: formData.unit,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined,
        reorderPoint: parseInt(formData.reorderPoint),
        reorderQuantity: parseInt(formData.reorderQuantity),
      });

      router.push('/dashboard/inventory');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '제품 등록에 실패했습니다.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="제품 등록" />

      <StaggerContainer className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <FadeIn>
            <Link
              href="/dashboard/inventory"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              재고 목록으로 돌아가기
            </Link>
          </FadeIn>

          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">새 제품 등록</h2>
                    <p className="text-sm text-muted-foreground">
                      재고 관리를 위한 새 제품을 등록합니다.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">기본 정보</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">제품명 *</label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="예: 아목시실린 캡슐 250mg"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">바코드</label>
                        <Input
                          name="barcode"
                          value={formData.barcode}
                          onChange={handleChange}
                          placeholder="바코드 번호"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">단위 *</label>
                        <Input
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          placeholder="예: 개, 박스, ml"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">제품 유형 *</label>
                        <NativeSelect
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          required
                        >
                          <option value="MEDICATION">약품</option>
                          <option value="VACCINE">백신</option>
                          <option value="SUPPLY">소모품</option>
                          <option value="EQUIPMENT">장비</option>
                          <option value="FOOD">사료</option>
                          <option value="OTHER">기타</option>
                        </NativeSelect>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">카테고리</label>
                        <NativeSelect
                          name="categoryId"
                          value={formData.categoryId}
                          onChange={handleChange}
                        >
                          <option value="">카테고리 선택</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">공급업체</label>
                      <NativeSelect
                        name="supplierId"
                        value={formData.supplierId}
                        onChange={handleChange}
                      >
                        <option value="">공급업체 선택</option>
                        {suppliers.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">설명</label>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="제품에 대한 상세 설명"
                        rows={3}
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-gray-900">가격 정보</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">원가</label>
                        <Input
                          type="number"
                          name="costPrice"
                          value={formData.costPrice}
                          onChange={handleChange}
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">판매가 *</label>
                        <Input
                          type="number"
                          name="sellingPrice"
                          value={formData.sellingPrice}
                          onChange={handleChange}
                          placeholder="0"
                          min="0"
                          step="1"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inventory Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-medium text-gray-900">재고 설정</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">재주문 기준 수량</label>
                        <Input
                          type="number"
                          name="reorderPoint"
                          value={formData.reorderPoint}
                          onChange={handleChange}
                          placeholder="10"
                          min="0"
                        />
                        <p className="text-xs text-muted-foreground">
                          재고가 이 수량 이하가 되면 재주문 알림을 받습니다.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">기본 주문 수량</label>
                        <Input
                          type="number"
                          name="reorderQuantity"
                          value={formData.reorderQuantity}
                          onChange={handleChange}
                          placeholder="20"
                          min="1"
                        />
                        <p className="text-xs text-muted-foreground">
                          발주 시 기본으로 설정되는 주문 수량입니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Link href="/dashboard/inventory">
                      <Button type="button" variant="outline">
                        취소
                      </Button>
                    </Link>
                    <Button type="submit" disabled={isSubmitting}>
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? '저장 중...' : '제품 등록'}
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
