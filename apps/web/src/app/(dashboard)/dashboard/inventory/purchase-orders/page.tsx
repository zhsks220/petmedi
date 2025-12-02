'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Truck,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  ArrowLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge, NativeSelect } from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  notes?: string;
  supplier: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    receivedQuantity: number;
  }>;
  _count?: {
    items: number;
  };
}

interface Supplier {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  DRAFT: '임시저장',
  PENDING: '승인대기',
  APPROVED: '승인됨',
  ORDERED: '주문완료',
  PARTIAL: '부분입고',
  RECEIVED: '입고완료',
  CANCELLED: '취소됨',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ORDERED: 'bg-purple-100 text-purple-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
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

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || '';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getPurchaseOrders(hospitalId, {
        ...(statusFilter && { status: statusFilter }),
        ...(supplierFilter && { supplierId: supplierFilter }),
        page: currentPage,
        limit: 20,
      });
      const data = response.data;
      setOrders(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '발주 목록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, statusFilter, supplierFilter, currentPage]);

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
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleApprove = async (orderId: string) => {
    try {
      await inventoryApi.approvePurchaseOrder(orderId);
      fetchOrders();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '발주 승인에 실패했습니다.');
    }
  };

  const handleCancel = async (orderId: string) => {
    if (!confirm('정말로 이 발주를 취소하시겠습니까?')) return;
    try {
      await inventoryApi.cancelPurchaseOrder(orderId);
      fetchOrders();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '발주 취소에 실패했습니다.');
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(term) ||
      order.supplier.name.toLowerCase().includes(term)
    );
  });

  // Calculate summary stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    ordered: orders.filter((o) => ['APPROVED', 'ORDERED'].includes(o.status)).length,
    received: orders.filter((o) => o.status === 'RECEIVED').length,
    totalAmount: orders
      .filter((o) => !['CANCELLED', 'DRAFT'].includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0),
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="발주 관리" />

      <div className="flex-1 p-6 space-y-6">
        {/* Back Link */}
        <Link
          href="/dashboard/inventory"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          재고 관리로 돌아가기
        </Link>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">전체 발주</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">승인 대기</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Package className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">진행 중</p>
                  <p className="text-2xl font-bold">{stats.ordered}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">입고 완료</p>
                  <p className="text-2xl font-bold">{stats.received}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Truck className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 발주 금액</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="발주번호, 공급업체로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-32"
            >
              <option value="">모든 상태</option>
              <option value="DRAFT">임시저장</option>
              <option value="PENDING">승인대기</option>
              <option value="APPROVED">승인됨</option>
              <option value="ORDERED">주문완료</option>
              <option value="PARTIAL">부분입고</option>
              <option value="RECEIVED">입고완료</option>
              <option value="CANCELLED">취소됨</option>
            </NativeSelect>
            <NativeSelect
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="w-40"
            >
              <option value="">모든 공급업체</option>
              {suppliers.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Link href="/dashboard/inventory/purchase-orders/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              발주 등록
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
                <Button variant="outline" size="sm" onClick={fetchOrders}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders List */}
        {!error && isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-gray-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error && filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">발주가 없습니다</h3>
            <p className="text-muted-foreground mb-4">아직 등록된 발주가 없습니다.</p>
            <Link href="/dashboard/inventory/purchase-orders/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                발주 등록하기
              </Button>
            </Link>
          </div>
        ) : !error ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Order Number */}
                      <div className="min-w-[140px]">
                        <div className="font-mono font-medium">{order.orderNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-12 w-px bg-gray-200" />

                      {/* Supplier Info */}
                      <div>
                        <h3 className="font-semibold">{order.supplier.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {order._count?.items || order.items?.length || 0}개 품목
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="h-12 w-px bg-gray-200" />

                      {/* Amount Info */}
                      <div className="min-w-[150px]">
                        <div className="font-semibold">{formatCurrency(order.totalAmount)}</div>
                        {order.expectedDeliveryDate && (
                          <div className="text-xs text-muted-foreground">
                            예정: {formatDate(order.expectedDeliveryDate)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}
                      >
                        {statusLabels[order.status] || order.status}
                      </span>

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        {order.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600"
                            onClick={() => handleApprove(order.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            승인
                          </Button>
                        )}
                        {['DRAFT', 'PENDING'].includes(order.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleCancel(order.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            취소
                          </Button>
                        )}
                        <Link href={`/dashboard/inventory/purchase-orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            상세보기
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
