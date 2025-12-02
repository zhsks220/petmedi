'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  FileText,
  CreditCard,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge, NativeSelect } from '@/components/ui';
import { invoicesApi } from '@/lib/api';
import { AxiosError } from 'axios';

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate?: string;
  createdAt: string;
  animal: {
    id: string;
    name: string;
    species: string;
    animalCode: string;
  };
  guardian: {
    id: string;
    name: string;
    phone?: string;
  };
  hospital: {
    id: string;
    name: string;
  };
  items: Array<{
    id: string;
    type: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

const statusLabels: Record<string, string> = {
  DRAFT: '임시저장',
  PENDING: '미수납',
  PARTIAL: '부분수납',
  PAID: '수납완료',
  OVERDUE: '연체',
  CANCELLED: '취소',
  REFUNDED: '환불',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  PARTIAL: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-purple-100 text-purple-800',
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

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoicesApi.getAll({
        ...(statusFilter && { status: statusFilter }),
        page: currentPage,
        limit: 20,
      });
      const data = response.data;
      setInvoices(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '청구서 목록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = invoices.filter((invoice) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      invoice.invoiceNumber.toLowerCase().includes(term) ||
      invoice.animal.name.toLowerCase().includes(term) ||
      invoice.animal.animalCode.toLowerCase().includes(term) ||
      invoice.guardian.name.toLowerCase().includes(term)
    );
  });

  // Calculate summary stats
  const stats = {
    total: invoices.length,
    pending: invoices.filter((i) => i.status === 'PENDING').length,
    partial: invoices.filter((i) => i.status === 'PARTIAL').length,
    paid: invoices.filter((i) => i.status === 'PAID').length,
    totalDue: invoices
      .filter((i) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status))
      .reduce((sum, i) => sum + i.dueAmount, 0),
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="수납 관리" />

      <div className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">전체 청구서</p>
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
                  <p className="text-sm text-muted-foreground">미수납</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">부분수납</p>
                  <p className="text-2xl font-bold">{stats.partial}</p>
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
                  <p className="text-sm text-muted-foreground">수납완료</p>
                  <p className="text-2xl font-bold">{stats.paid}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">미수금 합계</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(stats.totalDue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="청구서 번호, 환자명, 보호자명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">모든 상태</option>
              <option value="DRAFT">임시저장</option>
              <option value="PENDING">미수납</option>
              <option value="PARTIAL">부분수납</option>
              <option value="PAID">수납완료</option>
              <option value="OVERDUE">연체</option>
              <option value="CANCELLED">취소</option>
              <option value="REFUNDED">환불</option>
            </NativeSelect>
          </div>
          <Link href="/dashboard/billing/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              청구서 작성
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
                <Button variant="outline" size="sm" onClick={fetchInvoices}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices List */}
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
        ) : !error && filteredInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              청구서가 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              아직 등록된 청구서가 없습니다.
            </p>
            <Link href="/dashboard/billing/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                청구서 작성하기
              </Button>
            </Link>
          </div>
        ) : !error ? (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Invoice Number */}
                      <div className="min-w-[120px]">
                        <div className="font-mono text-sm text-muted-foreground">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(invoice.createdAt)}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-12 w-px bg-gray-200" />

                      {/* Patient Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{invoice.animal.name}</h3>
                          <Badge variant="secondary">{invoice.animal.species}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {invoice.animal.animalCode} · 보호자: {invoice.guardian.name}
                        </p>
                      </div>

                      {/* Divider */}
                      <div className="h-12 w-px bg-gray-200" />

                      {/* Amount Info */}
                      <div className="min-w-[200px]">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">총 금액</span>
                          <span className="font-medium">{formatCurrency(invoice.finalAmount)}</span>
                        </div>
                        {invoice.paidAmount > 0 && (
                          <div className="flex items-center justify-between text-green-600">
                            <span className="text-sm">수납액</span>
                            <span className="text-sm">{formatCurrency(invoice.paidAmount)}</span>
                          </div>
                        )}
                        {invoice.dueAmount > 0 && (
                          <div className="flex items-center justify-between text-red-600">
                            <span className="text-sm">미수금</span>
                            <span className="text-sm font-medium">{formatCurrency(invoice.dueAmount)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status & Actions */}
                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[invoice.status]}`}
                      >
                        {statusLabels[invoice.status] || invoice.status}
                      </span>

                      {/* Quick Actions */}
                      {['PENDING', 'PARTIAL'].includes(invoice.status) && (
                        <Link href={`/dashboard/billing/${invoice.id}/payment`}>
                          <Button size="sm">
                            <CreditCard className="h-4 w-4 mr-1" />
                            수납
                          </Button>
                        </Link>
                      )}

                      <Link href={`/dashboard/billing/${invoice.id}`}>
                        <Button variant="outline" size="sm">
                          상세보기
                        </Button>
                      </Link>
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
