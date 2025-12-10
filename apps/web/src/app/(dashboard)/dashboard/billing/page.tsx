'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  MoreHorizontal,
  Receipt
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Input, Card, CardContent, Badge, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { invoicesApi } from '@/lib/api';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

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
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  REFUNDED: 'bg-purple-50 text-purple-700 border-purple-200',
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount == null) return '₩0';
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
  const router = useRouter();
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
      .reduce((sum, i) => sum + (i.dueAmount ?? 0), 0),
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="수납 관리"
        description="진료비 청구 및 수납 내역을 관리합니다"
        icon={Receipt}
      >
        <Link href="/dashboard/billing/new">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            청구서 작성
          </Button>
        </Link>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <SlideUp className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">전체 청구서</p>
                    <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">미수납</p>
                    <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">부분수납</p>
                    <p className="text-xl font-bold text-blue-600">{stats.partial}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">수납완료</p>
                    <p className="text-xl font-bold text-emerald-600">{stats.paid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">미수금 합계</p>
                    <p className="text-lg font-bold text-red-600 truncate" title={formatCurrency(stats.totalDue)}>
                      {formatCurrency(stats.totalDue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Actions Bar */}
          <FadeIn className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-1 gap-4 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder="청구서 번호, 환자명, 보호자명 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <NativeSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-32 h-9"
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
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchInvoices}>
              <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </FadeIn>

          {/* Error State */}
          {error && (
            <FadeIn>
              <div className="p-4 rounded-lg border border-red-100 bg-red-50 text-red-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchInvoices} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  다시 시도
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Invoices Table */}
          <SlideUp className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[180px]">청구 정보</TableHead>
                  <TableHead>환자 / 보호자</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">청구 금액</TableHead>
                  <TableHead className="text-right">미수금</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-10 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-48 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-6 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-6 w-24 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                      <TableCell><div className="h-6 w-24 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Receipt className="h-8 w-8 mb-2 text-slate-300" />
                        <p>청구서가 없습니다</p>
                        <p className="text-xs text-slate-400 mt-1">검색 조건에 맞는 청구서를 찾을 수 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow
                      key={invoice.id}
                      className="cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => router.push(`/dashboard/billing/${invoice.id}`)}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-900 font-mono">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(invoice.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900">{invoice.animal.name}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-slate-500">
                              {invoice.animal.species}
                            </Badge>
                          </div>
                          <span className="text-xs text-slate-500">
                            보호자: {invoice.guardian.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`font-medium border ${statusColors[invoice.status]}`}>
                          {statusLabels[invoice.status] || invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="font-medium text-slate-900">{formatCurrency(invoice.finalAmount)}</span>
                          {invoice.paidAmount > 0 && (
                            <span className="text-xs text-emerald-600">완납: {formatCurrency(invoice.paidAmount)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.dueAmount > 0 ? (
                          <span className="font-medium text-red-600">{formatCurrency(invoice.dueAmount)}</span>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/billing/${invoice.id}`)}>
                              상세 보기
                            </DropdownMenuItem>
                            {['PENDING', 'PARTIAL'].includes(invoice.status) && (
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/billing/${invoice.id}/payment`)}>
                                <CreditCard className="h-3.5 w-3.5 mr-2" />
                                수납 처리
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              영수증 인쇄
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </SlideUp>

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <FadeIn className="flex items-center justify-center gap-2 mt-6 pb-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </FadeIn>
          )}
        </StaggerContainer>
      </div>
    </div>
  );
}
