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
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, NativeSelect, Textarea, Badge } from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';

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
      <div className="flex flex-col h-full">
        <Header title="제품 상세" />
        <div className="flex-1 p-6">
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col h-full">
        <Header title="제품 상세" />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-lg font-semibold mb-2">제품을 찾을 수 없습니다</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link href="/dashboard/inventory">
                <Button>목록으로 돌아가기</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const totalStock = getTotalStock();
  const stockStatus =
    totalStock === 0
      ? { label: '재고없음', color: 'bg-red-100 text-red-800' }
      : totalStock <= product.reorderPoint
      ? { label: '부족', color: 'bg-yellow-100 text-yellow-800' }
      : { label: '정상', color: 'bg-green-100 text-green-800' };

  return (
    <div className="flex flex-col h-full">
      <Header title="제품 상세" />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Back Button */}
          <Link
            href="/dashboard/inventory"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            재고 목록으로 돌아가기
          </Link>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Product Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{product.name}</h1>
                    <p className="text-muted-foreground">
                      {product.barcode && `바코드: ${product.barcode}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-1" />
                        수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        삭제
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                        취소
                      </Button>
                      <Button size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-1" />
                        저장
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">제품명 *</label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">바코드</label>
                      <Input
                        name="barcode"
                        value={formData.barcode}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">단위 *</label>
                      <Input
                        name="unit"
                        value={formData.unit}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">제품 유형</label>
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
                      <label className="text-sm font-medium">카테고리</label>
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
                      <label className="text-sm font-medium">원가</label>
                      <Input
                        type="number"
                        name="costPrice"
                        value={formData.costPrice}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">판매가 *</label>
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
                      <label className="text-sm font-medium">재주문 기준</label>
                      <Input
                        type="number"
                        name="reorderPoint"
                        value={formData.reorderPoint}
                        onChange={handleChange}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">기본 주문 수량</label>
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
                    <label className="text-sm font-medium">설명</label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                    />
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">유형</h3>
                    <Badge variant="secondary">
                      {productTypeLabels[product.type] || product.type}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">카테고리</h3>
                    <p>{product.category?.name || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">공급업체</h3>
                    <p>{product.supplier?.name || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">원가</h3>
                    <p>{product.costPrice ? formatCurrency(product.costPrice) : '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">판매가</h3>
                    <p className="font-semibold">{formatCurrency(product.sellingPrice)}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">단위</h3>
                    <p>{product.unit}</p>
                  </div>
                  {product.description && (
                    <div className="col-span-3">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">설명</h3>
                      <p className="text-sm">{product.description}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Status Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">재고 현황</h2>
                <Button onClick={() => setShowAdjustModal(true)}>
                  재고 조정
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">현재 재고</p>
                  <p className="text-3xl font-bold">
                    {totalStock} <span className="text-lg font-normal">{product.unit}</span>
                  </p>
                  <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                    {stockStatus.label}
                  </span>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">재주문 기준</p>
                  <p className="text-2xl font-semibold">{product.reorderPoint} {product.unit}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">기본 주문 수량</p>
                  <p className="text-2xl font-semibold">{product.reorderQuantity} {product.unit}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-muted-foreground">재고 가치</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(totalStock * (product.costPrice || product.sellingPrice))}
                  </p>
                </div>
              </div>

              {/* Stock Lots */}
              {product.stocks && product.stocks.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium mb-3">재고 로트</h3>
                  <div className="space-y-2">
                    {product.stocks.map((stock) => (
                      <div
                        key={stock.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{stock.quantity} {product.unit}</span>
                          {stock.lotNumber && (
                            <span className="text-sm text-muted-foreground ml-2">
                              (로트: {stock.lotNumber})
                            </span>
                          )}
                        </div>
                        {stock.expirationDate && (
                          <span className="text-sm text-muted-foreground">
                            유통기한: {formatDate(stock.expirationDate)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold">최근 재고 변동</h2>
              </div>

              {transactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  재고 변동 기록이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            ['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type)
                              ? 'bg-green-100'
                              : 'bg-red-100'
                          }`}
                        >
                          {['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type) ? (
                            <Plus className="h-4 w-4 text-green-600" />
                          ) : (
                            <Minus className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {transactionTypeLabels[tx.type] || tx.type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTime(tx.createdAt)}
                            {tx.createdBy && ` · ${tx.createdBy.name}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-semibold ${
                            ['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type)
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {['PURCHASE', 'TRANSFER_IN', 'RETURN', 'INITIAL'].includes(tx.type)
                            ? '+'
                            : '-'}
                          {Math.abs(tx.quantity)} {product.unit}
                        </span>
                        {tx.notes && (
                          <p className="text-xs text-muted-foreground">{tx.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stock Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">재고 조정</h2>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={adjustType === 'add' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setAdjustType('add')}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    입고
                  </Button>
                  <Button
                    type="button"
                    variant={adjustType === 'subtract' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setAdjustType('subtract')}
                  >
                    <Minus className="h-4 w-4 mr-1" />
                    출고
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">수량</label>
                  <Input
                    type="number"
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(e.target.value)}
                    placeholder="수량 입력"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    현재 재고: {totalStock} {product.unit} →{' '}
                    {adjustType === 'add'
                      ? totalStock + (parseInt(adjustQuantity) || 0)
                      : Math.max(0, totalStock - (parseInt(adjustQuantity) || 0))}{' '}
                    {product.unit}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">사유</label>
                  <Textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="조정 사유를 입력하세요"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowAdjustModal(false)}
                  >
                    취소
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAdjustStock}
                    disabled={isSubmitting || !adjustQuantity}
                  >
                    {isSubmitting ? '처리 중...' : '조정하기'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
