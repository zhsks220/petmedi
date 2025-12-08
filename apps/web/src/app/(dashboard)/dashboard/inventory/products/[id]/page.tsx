'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Package,
  Edit2,
  Trash2,
  History,
  AlertTriangle,
  Plus,
  Minus,
  Tag,
  Building2,
  DollarSign,
  Box,
  Scale
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import {
  Button,
  Input,
  Card,
  CardContent,
  NativeSelect,
  Textarea,
  Badge,
  Label,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  type: string;
  unit: string;
  description?: string;
  costPrice?: number;
  sellingPrice: number;
  reorderPoint: number;
  reorderQuantity: number;
  isActive: boolean;
  category?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  stocks?: Array<{
    id: string;
    quantity: number;
    lotNumber?: string;
    expirationDate?: string;
  }>;
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  createdBy?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

const productTypeLabels: Record<string, string> = {
  MEDICATION: '약품',
  SUPPLY: '소모품',
  EQUIPMENT: '장비',
  VACCINE: '백신',
  FOOD: '사료',
  OTHER: '기타',
};

const transactionTypeLabels: Record<string, string> = {
  PURCHASE: '입고',
  SALE: '출고',
  ADJUSTMENT: '조정',
  RETURN: '반품',
  EXPIRED: '폐기(유통기한)',
  DAMAGED: '폐기(손상)',
  TRANSFER_IN: '이전입고',
  TRANSFER_OUT: '이전출고',
  INITIAL: '초기재고',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || '';
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQuantity, setAdjustQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    type: '',
    unit: '',
    description: '',
    categoryId: '',
    supplierId: '',
    costPrice: '',
    sellingPrice: '',
    reorderPoint: '',
    reorderQuantity: '',
  });

  const fetchProduct = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await inventoryApi.getProductById(productId);
      const data = response.data;
      setProduct(data);
      setFormData({
        name: data.name,
        barcode: data.barcode || '',
        type: data.type,
        unit: data.unit,
        description: data.description || '',
        categoryId: data.category?.id || '',
        supplierId: data.supplier?.id || '',
        costPrice: data.costPrice?.toString() || '',
        sellingPrice: data.sellingPrice.toString(),
        reorderPoint: data.reorderPoint.toString(),
        reorderQuantity: data.reorderQuantity.toString(),
      });
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '제품 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const fetchTransactions = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getTransactions(hospitalId, { productId, limit: 10 });
      setTransactions(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  }, [hospitalId, productId]);

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
    fetchProduct();
    fetchTransactions();
    fetchCategories();
    fetchSuppliers();
  }, [fetchProduct, fetchTransactions, fetchCategories, fetchSuppliers]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await inventoryApi.updateProduct(productId, {
        name: formData.name,
        barcode: formData.barcode || undefined,
        type: formData.type,
        unit: formData.unit,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        supplierId: formData.supplierId || undefined,
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        sellingPrice: parseFloat(formData.sellingPrice),
        reorderPoint: parseInt(formData.reorderPoint),
        reorderQuantity: parseInt(formData.reorderQuantity),
      });

      setIsEditing(false);
      fetchProduct();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '제품 수정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 이 제품을 삭제하시겠습니까?')) return;

    try {
      await inventoryApi.deleteProduct(productId);
      router.push('/dashboard/inventory');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '제품 삭제에 실패했습니다.');
    }
  };

  const handleAdjustStock = async () => {
    if (!adjustQuantity || parseInt(adjustQuantity) <= 0) return;

    setIsSubmitting(true);
    try {
      const quantity = parseInt(adjustQuantity);
      const newQuantity =
        adjustType === 'add'
          ? getTotalStock() + quantity
          : Math.max(0, getTotalStock() - quantity);

      await inventoryApi.adjustStock({
        hospitalId,
        productId,
        newQuantity,
        reason: adjustReason || undefined,
      });

      setShowAdjustModal(false);
      setAdjustQuantity('');
      setAdjustReason('');
      fetchProduct();
      fetchTransactions();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '재고 조정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTotalStock = (): number => {
    return product?.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <PageHeader title="제품 상세" />
        <div className="flex-1 p-6">
          <Card className="animate-pulse border-slate-200">
            <CardContent className="p-6">
              <div className="h-64 bg-slate-100 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <PageHeader title="제품 상세" />
        <div className="flex-1 p-6">
          <FadeIn>
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
                <h2 className="text-lg font-semibold text-slate-900 mb-2">제품을 찾을 수 없습니다</h2>
                <p className="text-slate-500 mb-6">{error || '요청하신 제품 정보가 존재하지 않습니다.'}</p>
                <Link href="/dashboard/inventory">
                  <Button variant="outline">목록으로 돌아가기</Button>
                </Link>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  const totalStock = getTotalStock();
  const stockStatus =
    totalStock === 0
      ? { label: '재고없음', color: 'bg-red-100 text-red-700' }
      : totalStock <= product.reorderPoint
        ? { label: '부족', color: 'bg-amber-100 text-amber-700' }
        : { label: '정상', color: 'bg-emerald-100 text-emerald-700' };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title={product.name}
        description={product.barcode ? `바코드: ${product.barcode}` : '제품 상세 정보'}
        icon={Package}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory">
            <Button variant="outline" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          {!isEditing ? (
            <>
              <Button onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                수정
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                취소
              </Button>
              <Button onClick={(e) => handleSubmit(e as any)} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {error && (
            <FadeIn>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            </FadeIn>
          )}

          {/* Product Info Card */}
          <SlideUp>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>제품명 <span className="text-red-500">*</span></Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>바코드</Label>
                        <Input
                          name="barcode"
                          value={formData.barcode}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>단위 <span className="text-red-500">*</span></Label>
                        <Input
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>제품 유형</Label>
                        <NativeSelect name="type" value={formData.type} onChange={handleChange}>
                          <option value="MEDICATION">약품</option>
                          <option value="VACCINE">백신</option>
                          <option value="SUPPLY">소모품</option>
                          <option value="EQUIPMENT">장비</option>
                          <option value="FOOD">사료</option>
                          <option value="OTHER">기타</option>
                        </NativeSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>카테고리</Label>
                        <NativeSelect
                          name="categoryId"
                          value={formData.categoryId}
                          onChange={handleChange}
                        >
                          <option value="">선택 안함</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>공급업체</Label>
                        <NativeSelect
                          name="supplierId"
                          value={formData.supplierId}
                          onChange={handleChange}
                        >
                          <option value="">선택 안함</option>
                          {suppliers.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                      <div className="space-y-2">
                        <Label>원가</Label>
                        <Input
                          type="number"
                          name="costPrice"
                          value={formData.costPrice}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>판매가 <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          name="sellingPrice"
                          value={formData.sellingPrice}
                          onChange={handleChange}
                          min="0"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>재주문 기준 (Reorder Point)</Label>
                        <Input
                          type="number"
                          name="reorderPoint"
                          value={formData.reorderPoint}
                          onChange={handleChange}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>기본 주문 수량</Label>
                        <Input
                          type="number"
                          name="reorderQuantity"
                          value={formData.reorderQuantity}
                          onChange={handleChange}
                          min="1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>설명</Label>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-md">
                        <Tag className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">유형</p>
                        <Badge variant="secondary" className="font-normal text-slate-700 bg-slate-100 hover:bg-slate-200">
                          {productTypeLabels[product.type] || product.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-md">
                        <Box className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">카테고리</p>
                        <p className="text-slate-900 font-medium">{product.category?.name || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-md">
                        <Building2 className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">공급업체</p>
                        <p className="text-slate-900 font-medium">{product.supplier?.name || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-md">
                        <Scale className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">단위</p>
                        <p className="text-slate-900 font-medium">{product.unit}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-md">
                        <DollarSign className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">원가</p>
                        <p className="text-slate-900 font-medium">{product.costPrice ? formatCurrency(product.costPrice) : '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-md">
                        <DollarSign className="h-5 w-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">판매가</p>
                        <p className="text-lg font-bold text-slate-900">{formatCurrency(product.sellingPrice)}</p>
                      </div>
                    </div>

                    {product.description && (
                      <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-2">
                        <p className="text-sm font-medium text-slate-500 mb-2">설명</p>
                        <div className="bg-slate-50 p-3 rounded-md text-sm text-slate-700">
                          {product.description}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>

          {/* Stock Status Card */}
          <SlideUp delay={0.1}>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-lg font-semibold text-slate-900">재고 현황</h2>
                  </div>
                  <Button onClick={() => setShowAdjustModal(true)}>
                    재고 조정
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">현재 재고</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="text-3xl font-bold text-slate-900">
                        {totalStock}
                      </p>
                      <span className="text-lg text-slate-600 mb-1">{product.unit}</span>
                    </div>
                    <span className={`inline-flex mt-3 px-2 py-0.5 rounded-full text-xs font-medium border ${stockStatus.color.replace('text-', 'border-').replace('bg-', 'bg-opacity-20 ')}`}>
                      {stockStatus.label}
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">재주문 기준</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="text-2xl font-semibold text-slate-900">{product.reorderPoint}</p>
                      <span className="text-base text-slate-600 mb-1">{product.unit}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">기본 주문 수량</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p className="text-2xl font-semibold text-slate-900">{product.reorderQuantity}</p>
                      <span className="text-base text-slate-600 mb-1">{product.unit}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium">재고 가치</p>
                    <p className="text-2xl font-semibold text-slate-900 mt-1">
                      {formatCurrency(totalStock * (product.costPrice || product.sellingPrice))}
                    </p>
                  </div>
                </div>

                {/* Stock Lots */}
                {product.stocks && product.stocks.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-slate-900 mb-3">재고 로트 상세</h3>
                    <div className="border rounded-md overflow-hidden">
                      <div className="grid grid-cols-3 bg-slate-50/50 p-3 text-sm font-medium text-slate-500 border-b">
                        <div>수량</div>
                        <div>로트(Lot) 번호</div>
                        <div className="text-right">유통기한</div>
                      </div>
                      <div className="divide-y">
                        {product.stocks.map((stock) => (
                          <div key={stock.id} className="grid grid-cols-3 p-3 text-sm hover:bg-slate-50/50">
                            <div className="font-medium text-slate-900">{stock.quantity} {product.unit}</div>
                            <div className="text-slate-600">{stock.lotNumber || '-'}</div>
                            <div className="text-right text-slate-600">
                              {stock.expirationDate ? formatDate(stock.expirationDate) : '-'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>

          {/* Recent Transactions */}
          <SlideUp delay={0.2}>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <History className="h-5 w-5 text-slate-500" />
                  <h2 className="text-lg font-semibold text-slate-900">최근 재고 변동</h2>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                    <History className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">재고 변동 기록이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-0 divide-y border rounded-lg overflow-hidden">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-4 bg-white hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-2 rounded-lg ${['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type)
                              ? 'bg-emerald-50'
                              : 'bg-red-50'
                              }`}
                          >
                            {['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type) ? (
                              <Plus className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Minus className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {transactionTypeLabels[tx.type] || tx.type}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatDateTime(tx.createdAt)}
                              {tx.createdBy && ` · ${tx.createdBy.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-bold ${['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type)
                              ? 'text-emerald-600'
                              : 'text-red-600'
                              }`}
                          >
                            {['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type)
                              ? '+'
                              : '-'}
                            {Math.abs(tx.quantity)} {product.unit}
                          </span>
                          {tx.notes && (
                            <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate ml-auto">{tx.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>
        </StaggerContainer>

        {/* Stock Adjust Modal */}
        <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>재고 조정</DialogTitle>
              <DialogDescription>
                수동으로 재고 수량을 조정합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                <Button
                  type="button"
                  variant={adjustType === 'add' ? 'secondary' : 'ghost'}
                  className={`flex-1 rounded-md shadow-sm ${adjustType === 'add' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => setAdjustType('add')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  입고 (추가)
                </Button>
                <Button
                  type="button"
                  variant={adjustType === 'subtract' ? 'secondary' : 'ghost'}
                  className={`flex-1 rounded-md shadow-sm ${adjustType === 'subtract' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                  onClick={() => setAdjustType('subtract')}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  출고 (차감)
                </Button>
              </div>

              <div className="space-y-3">
                <Label>수량</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="0"
                    min="1"
                    className="pl-4 pr-12 text-right font-mono text-lg"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {product.unit}
                  </div>
                </div>
                <p className="text-sm text-slate-500 text-right">
                  예상 재고: <span className="font-medium text-slate-900">{totalStock}</span> →{' '}
                  <span className={`font-bold ${adjustType === 'add' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {adjustType === 'add'
                      ? totalStock + (parseInt(adjustQuantity) || 0)
                      : Math.max(0, totalStock - (parseInt(adjustQuantity) || 0))}
                  </span>
                </p>
              </div>

              <div className="space-y-3">
                <Label>조정 사유</Label>
                <Textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="예: 파손 폐기, 실사 조정 등"
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdjustModal(false)}>취소</Button>
              <Button
                onClick={handleAdjustStock}
                disabled={isSubmitting || !adjustQuantity}
                className={adjustType === 'subtract' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {isSubmitting ? '처리 중...' : '조정 내용 저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
