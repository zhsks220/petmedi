'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Truck, Plus, Trash2, Calendar, FileText, Package } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import {
  Button,
  Input,
  Card,
  CardContent,
  NativeSelect,
  Textarea,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Label
} from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

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
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="발주 등록"
        description="새로운 발주를 등록합니다"
        icon={Truck}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory/purchase-orders">
            <Button variant="outline" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              목록으로
            </Button>
          </Link>
          <Button onClick={(e) => handleSubmit(e as any)} disabled={isSubmitting || orderItems.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? '저장 중...' : '발주 저장'}
          </Button>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-4xl mx-auto space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <SlideUp>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">기본 정보</h2>
                      <p className="text-sm text-slate-500">
                        발주할 공급업체와 일정을 입력하세요.
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
                      <Label htmlFor="supplierId">공급업체 <span className="text-red-500">*</span></Label>
                      <NativeSelect
                        id="supplierId"
                        name="supplierId"
                        value={formData.supplierId}
                        onChange={handleChange}
                        required
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
                    <div className="space-y-2">
                      <Label htmlFor="expectedDeliveryDate">예상 입고일</Label>
                      <div className="relative">
                        <Input
                          id="expectedDeliveryDate"
                          type="date"
                          name="expectedDeliveryDate"
                          value={formData.expectedDeliveryDate}
                          onChange={handleChange}
                          className="pl-9 bg-slate-50 border-slate-200"
                        />
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Label htmlFor="notes">메모</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="발주 관련 특이사항이나 메모를 입력하세요 (선택)"
                      rows={3}
                      className="bg-slate-50 border-slate-200 resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            {/* Order Items Card */}
            <SlideUp delay={0.1}>
              <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        <Package className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">발주 품목</h3>
                        <p className="text-sm text-slate-500">
                          발주할 제품을 추가하세요.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Add Item */}
                  <div className="flex gap-2 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <NativeSelect
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="flex-1 bg-white border-slate-200"
                    >
                      <option value="">제품을 선택하세요</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}{product.barcode ? ` (${product.barcode})` : ''}
                        </option>
                      ))}
                    </NativeSelect>
                    <Button type="button" onClick={handleAddItem} disabled={!selectedProductId}>
                      <Plus className="h-4 w-4 mr-2" />
                      추가
                    </Button>
                  </div>

                  {/* Items List */}
                  {orderItems.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                      <Package className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-slate-500 font-medium">발주할 제품이 없습니다</p>
                      <p className="text-sm text-slate-400">상단의 입력창을 통해 제품을 추가해주세요.</p>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[40%]">제품명</TableHead>
                            <TableHead className="text-right w-[15%]">수량</TableHead>
                            <TableHead className="text-right w-[20%]">단가</TableHead>
                            <TableHead className="text-right w-[20%]">금액</TableHead>
                            <TableHead className="w-[5%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orderItems.map((item) => (
                            <TableRow key={item.productId} className="hover:bg-slate-50/50">
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-900">{item.productName}</p>
                                  <p className="text-xs text-slate-500">{item.unit}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleItemChange(item.productId, 'quantity', parseInt(e.target.value) || 0)
                                  }
                                  min="1"
                                  className="text-right h-8"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={item.unitPrice}
                                  onChange={(e) =>
                                    handleItemChange(item.productId, 'unitPrice', parseFloat(e.target.value) || 0)
                                  }
                                  min="0"
                                  className="text-right h-8"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium text-slate-900">
                                {formatCurrency(item.quantity * item.unitPrice)}
                              </TableCell>
                              <TableCell className="text-center p-0 pr-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleRemoveItem(item.productId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="bg-slate-50/50 p-4 border-t flex justify-end items-center gap-4">
                        <span className="text-sm font-medium text-slate-500">총 발주 금액</span>
                        <span className="text-xl font-bold text-indigo-600">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </SlideUp>
          </form>
        </StaggerContainer>
      </div>
    </div>
  );
}
