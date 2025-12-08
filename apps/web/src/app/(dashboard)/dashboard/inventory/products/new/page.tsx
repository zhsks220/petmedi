'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Package, Tag, Building2, Box } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import {
  Button,
  Input,
  Card,
  CardContent,
  NativeSelect,
  Textarea,
  Label
} from '@/components/ui';
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
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="제품 등록"
        description="새로운 제품을 등록합니다"
        icon={Package}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory">
            <Button variant="outline" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <Button onClick={(e) => handleSubmit(e as any)} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? '저장 중...' : '저장'}
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <SlideUp>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Tag className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">기본 정보</h2>
                      <p className="text-sm text-slate-500">
                        제품의 기본 정보를 입력하세요.
                      </p>
                    </div>
                  </div>

                  {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">제품명 <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="예: 아목시실린 캡슐 250mg"
                        required
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="barcode">바코드</Label>
                      <Input
                        id="barcode"
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                        placeholder="바코드 번호"
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">단위 <span className="text-red-500">*</span></Label>
                      <Input
                        id="unit"
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        placeholder="예: 개, 박스, ml"
                        required
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">제품 유형 <span className="text-red-500">*</span></Label>
                      <NativeSelect
                        id="type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                        className="bg-slate-50 border-slate-200"
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
                      <Label htmlFor="categoryId">카테고리</Label>
                      <NativeSelect
                        id="categoryId"
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleChange}
                        className="bg-slate-50 border-slate-200"
                      >
                        <option value="">카테고리 선택</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supplierId">공급업체</Label>
                      <NativeSelect
                        id="supplierId"
                        name="supplierId"
                        value={formData.supplierId}
                        onChange={handleChange}
                        className="bg-slate-50 border-slate-200"
                      >
                        <option value="">공급업체 선택</option>
                        {suppliers.map((sup) => (
                          <option key={sup.id} value={sup.id}>
                            {sup.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="제품에 대한 상세 설명"
                      rows={3}
                      className="resize-none bg-slate-50 border-slate-200"
                    />
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            {/* Pricing */}
            <SlideUp delay={0.1}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Building2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">가격 정보</h2>
                      <p className="text-sm text-slate-500">
                        구매 원가와 판매 가격을 설정하세요.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="costPrice">원가</Label>
                      <Input
                        id="costPrice"
                        type="number"
                        name="costPrice"
                        value={formData.costPrice}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        step="1"
                        className="bg-slate-50 border-slate-200 text-right"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sellingPrice">판매가 <span className="text-red-500">*</span></Label>
                      <Input
                        id="sellingPrice"
                        type="number"
                        name="sellingPrice"
                        value={formData.sellingPrice}
                        onChange={handleChange}
                        placeholder="0"
                        min="0"
                        step="1"
                        required
                        className="bg-slate-50 border-slate-200 text-right font-medium"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            {/* Inventory Settings */}
            <SlideUp delay={0.2}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Box className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">재고 설정</h2>
                      <p className="text-sm text-slate-500">
                        자동 발주 알림을 위한 재고 수량을 설정하세요.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="reorderPoint">재주문 기준 수량 (Reorder Point)</Label>
                      <Input
                        id="reorderPoint"
                        type="number"
                        name="reorderPoint"
                        value={formData.reorderPoint}
                        onChange={handleChange}
                        placeholder="10"
                        min="0"
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        재고가 이 수량 이하가 되면 재주문 알림이 표시됩니다.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reorderQuantity">기본 주문 수량</Label>
                      <Input
                        id="reorderQuantity"
                        type="number"
                        name="reorderQuantity"
                        value={formData.reorderQuantity}
                        onChange={handleChange}
                        placeholder="20"
                        min="1"
                        className="bg-slate-50 border-slate-200"
                      />
                      <p className="text-xs text-slate-500">
                        발주 시 기본으로 설정되는 주문 수량입니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </form>
        </StaggerContainer>
      </div>
    </div>
  );
}
