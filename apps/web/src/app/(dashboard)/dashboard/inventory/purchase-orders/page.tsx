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
  MoreHorizontal,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  NativeSelect,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

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
  DRAFT: 'bg-slate-100 text-slate-800',
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  ORDERED: 'bg-indigo-100 text-indigo-800',
  PARTIAL: 'bg-orange-100 text-orange-800',
  RECEIVED: 'bg-emerald-100 text-emerald-800',
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
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="발주 관리"
        description="약품 및 소모품 발주 내역을 관리합니다"
        icon={Truck}
      >
        <Link href="/dashboard/inventory/purchase-orders/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            새 발주
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <SlideUp delay={0.1}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Truck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">전체 발주</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            <SlideUp delay={0.2}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">승인 대기</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            <SlideUp delay={0.3}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <Package className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">진행 중</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.ordered}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            <SlideUp delay={0.4}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">입고 완료</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.received}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            <SlideUp delay={0.5}>
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Truck className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 font-medium">총 발주 금액</p>
                      <p className="text-lg font-bold text-slate-900 truncate" title={formatCurrency(stats.totalAmount)}>
                        {formatCurrency(stats.totalAmount)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </div>

          {/* Filters */}
          <FadeIn>
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="search"
                      placeholder="발주번호, 공급업체로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-slate-50 border-slate-200"
                    />
                  </div>
                  <NativeSelect
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-40 bg-slate-50 border-slate-200"
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
                    className="w-full sm:w-48 bg-slate-50 border-slate-200"
                  >
                    <option value="">모든 공급업체</option>
                    {suppliers.map((sup) => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* Orders Table */}
          <SlideUp delay={0.2}>
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              {error ? (
                <div className="p-6 text-center">
                  <div className="inline-flex p-3 bg-red-50 rounded-full mb-4">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">오류 발생</h3>
                  <p className="text-slate-500 mb-4">{error}</p>
                  <Button variant="outline" onClick={fetchOrders}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    다시 시도
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableHead className="w-[180px]">발주번호</TableHead>
                        <TableHead>공급업체</TableHead>
                        <TableHead>주문일</TableHead>
                        <TableHead>입고예정일</TableHead>
                        <TableHead>품목 수</TableHead>
                        <TableHead className="text-right">총 금액</TableHead>
                        <TableHead className="text-center">상태</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        [...Array(5)].map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 w-12 bg-slate-100 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                            <TableCell><div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse mx-auto" /></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))
                      ) : filteredOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                            <Truck className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                            <p className="text-lg font-medium text-slate-900">발주 내역이 없습니다</p>
                            <p className="text-sm text-slate-500 mb-4">새로운 발주를 등록해보세요.</p>
                            <Link href="/dashboard/inventory/purchase-orders/new">
                              <Button variant="outline">
                                <Plus className="h-4 w-4 mr-2" />
                                발주 등록하기
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrders.map((order) => (
                          <TableRow key={order.id} className="hover:bg-slate-50/50 group transition-colors">
                            <TableCell className="font-medium font-mono text-slate-600">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              {order.supplier.name}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {formatDate(order.orderDate)}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : '-'}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {order._count?.items || order.items?.length || 0}개
                            </TableCell>
                            <TableCell className="text-right font-medium text-slate-900">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="secondary" className={`${statusColors[order.status]} border-0 font-normal`}>
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <Link href={`/dashboard/inventory/purchase-orders/${order.id}`}>
                                    <DropdownMenuItem>
                                      <FileText className="h-4 w-4 mr-2" />
                                      상세보기
                                    </DropdownMenuItem>
                                  </Link>
                                  {order.status === 'PENDING' && (
                                    <DropdownMenuItem onClick={() => handleApprove(order.id)} className="text-emerald-600 focus:text-emerald-700">
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      승인
                                    </DropdownMenuItem>
                                  )}
                                  {['DRAFT', 'PENDING'].includes(order.status) && (
                                    <DropdownMenuItem onClick={() => handleCancel(order.id)} className="text-red-600 focus:text-red-700">
                                      <XCircle className="h-4 w-4 mr-2" />
                                      취소
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </SlideUp>

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <FadeIn>
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-slate-500 font-medium px-2">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </FadeIn>
          )}
        </StaggerContainer>
      </div>
    </div>
  );
}
