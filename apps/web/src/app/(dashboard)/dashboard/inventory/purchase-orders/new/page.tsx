'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Truck, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, NativeSelect, Textarea } from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  barcode?: string;
  unit: string;
  costPrice?: number;
  reorderQuantity: number;
}

interface OrderItem {
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || '';

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState({
    supplierId: '',
    expectedDeliveryDate: '',
    notes: '',
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');

  const fetchSuppliers = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getSuppliers(hospitalId);
      setSuppliers(response.data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
    }
  }, [hospitalId]);

  const fetchProducts = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getProducts(hospitalId, { limit: 100 });
      setProducts(response.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchSuppliers();
    fetchProducts();
  }, [fetchSuppliers, fetchProducts]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;

    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    // Check if product already exists in items
    if (orderItems.some((item) => item.productId === selectedProductId)) {
      setError('이미 추가된 제품입니다.');
      return;
    }

    setOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: product.reorderQuantity || 1,
        unitPrice: product.costPrice || 0,
      },
    ]);
    setSelectedProductId('');
    setError(null);
  };

  const handleRemoveItem = (productId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleItemChange = (productId: string, field: 'quantity' | 'unitPrice', value: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item
      )
    );
  };

  const totalAmount = orderItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setError('공급업체를 선택해주세요.');
      return;
    }

    if (orderItems.length === 0) {
      setError('최소 1개 이상의 제품을 추가해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await inventoryApi.createPurchaseOrder({
        hospitalId,
        supplierId: formData.supplierId,
        expectedDate: formData.expectedDeliveryDate || undefined,
        notes: formData.notes || undefined,
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });

      router.push('/dashboard/inventory/purchase-orders');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '발주 등록에 실패했습니다.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="발주 등록" />

      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            href="/dashboard/inventory/purchase-orders"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            발주 목록으로 돌아가기
          </Link>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">발주 정보</h2>
                    <p className="text-sm text-muted-foreground">
                      새로운 발주를 등록합니다.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">공급업체 *</label>
                    <NativeSelect
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={handleChange}
                      required
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
                    <label className="text-sm font-medium">예상 입고일</label>
                    <Input
                      type="date"
                      name="expectedDeliveryDate"
                      value={formData.expectedDeliveryDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">메모</label>
                  <Textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="발주 관련 메모"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Order Items Card */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">발주 품목</h3>

                {/* Add Item */}
                <div className="flex gap-2 mb-4">
                  <NativeSelect
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="flex-1"
                  >
                    <option value="">제품 선택</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}{product.barcode ? ` (${product.barcode})` : ''}
                      </option>
                    ))}
                  </NativeSelect>
                  <Button type="button" onClick={handleAddItem} disabled={!selectedProductId}>
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>

                {/* Items List */}
                {orderItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    발주할 제품을 추가해주세요.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-muted-foreground">
                      <div className="col-span-5">제품명</div>
                      <div className="col-span-2 text-right">수량</div>
                      <div className="col-span-2 text-right">단가</div>
                      <div className="col-span-2 text-right">금액</div>
                      <div className="col-span-1"></div>
                    </div>

                    {orderItems.map((item) => (
                      <div
                        key={item.productId}
                        className="grid grid-cols-12 gap-2 px-3 py-2 border rounded-lg items-center"
                      >
                        <div className="col-span-5">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">{item.unit}</p>
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.productId, 'quantity', parseInt(e.target.value) || 0)
                            }
                            min="1"
                            className="text-right"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)
                            }
                            min="0"
                            className="text-right"
                          />
                        </div>
                        <div className="col-span-2 text-right font-medium">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        <div className="col-span-1 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleRemoveItem(item.productId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Total */}
                    <div className="flex justify-end items-center gap-4 pt-4 border-t mt-4">
                      <span className="text-lg font-medium">총 발주 금액</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3">
              <Link href="/dashboard/inventory/purchase-orders">
                <Button type="button" variant="outline">
                  취소
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting || orderItems.length === 0}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? '저장 중...' : '발주 등록'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
