'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CreditCard,
  FileText,
  Printer,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Card, CardContent, Badge, Input, NativeSelect } from '@/components/ui';
import { invoicesApi } from '@/lib/api';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface InvoiceItem {
  id: string;
  type: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  discountAmount?: number;
  totalPrice: number;
  sortOrder: number;
}

interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  method: string;
  status: string;
  cardNumber?: string;
  cardCompany?: string;
  cardApprovalNo?: string;
  paidAt?: string;
  notes?: string;
}

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
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  animal: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    animalCode: string;
  };
  guardian: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  hospital: {
    id: string;
    name: string;
  };
  items: InvoiceItem[];
  payments: Payment[];
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

const itemTypeLabels: Record<string, string> = {
  CONSULTATION: '진료비',
  SURGERY: '수술비',
  MEDICATION: '약제비',
  INJECTION: '주사비',
  LAB_TEST: '검사비',
  IMAGING: '영상검사',
  HOSPITALIZATION: '입원비',
  GROOMING: '미용비',
  VACCINATION: '예방접종',
  SUPPLIES: '용품',
  DISCOUNT: '할인',
  OTHER: '기타',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: '현금',
  CARD: '카드',
  TRANSFER: '계좌이체',
  MOBILE: '모바일',
  INSURANCE: '보험',
  POINT: '포인트',
  OTHER: '기타',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: '대기',
  COMPLETED: '완료',
  FAILED: '실패',
  CANCELLED: '취소',
  REFUNDED: '환불',
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
    month: 'long',
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await invoicesApi.getById(invoiceId);
      setInvoice(response.data);
      setPaymentAmount(response.data.dueAmount?.toString() || '0');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      setError(axiosError.response?.data?.message || '청구서를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handlePayment = async () => {
    if (!invoice) return;
    setIsProcessing(true);
    try {
      await invoicesApi.createPayment({
        invoiceId: invoice.id,
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
      });
      setShowPaymentModal(false);
      fetchInvoice();
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      alert(axiosError.response?.data?.message || '결제 처리에 실패했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm('정말로 이 청구서를 삭제하시겠습니까?')) return;

    try {
      await invoicesApi.delete(invoice.id);
      router.push('/dashboard/billing');
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      alert(axiosError.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="청구서 상세" />
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-40 bg-gray-100 rounded-lg" />
            <div className="h-60 bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col h-full">
        <Header title="청구서 상세" />
        <div className="flex-1 p-6">
          <FadeIn>
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
                  <Button variant="outline" size="sm" onClick={fetchInvoice}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    다시 시도
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="청구서 상세" />

      <StaggerContainer className="flex-1 p-6 space-y-6">
        {/* Back Button & Actions */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <Link href="/dashboard/billing">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                목록으로
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                인쇄
              </Button>
              {invoice.status === 'DRAFT' && (
                <>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    수정
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </Button>
                </>
              )}
            </div>
          </div>
        </FadeIn>

        {/* Invoice Header */}
        <SlideUp>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[invoice.status]}`}>
                      {statusLabels[invoice.status]}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    발행일: {formatDate(invoice.createdAt)}
                    {invoice.dueDate && ` · 결제기한: ${formatDate(invoice.dueDate)}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">병원</p>
                  <p className="font-medium">{invoice.hospital.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </SlideUp>

        {/* Patient & Guardian Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">환자 정보</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">환자명</span>
                    <span className="font-medium">{invoice.animal.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">환자 코드</span>
                    <span className="font-mono">{invoice.animal.animalCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">종류</span>
                    <span>{invoice.animal.species} {invoice.animal.breed && `(${invoice.animal.breed})`}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">보호자 정보</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">이름</span>
                    <span className="font-medium">{invoice.guardian.name}</span>
                  </div>
                  {invoice.guardian.phone && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">연락처</span>
                      <span>{invoice.guardian.phone}</span>
                    </div>
                  )}
                  {invoice.guardian.email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">이메일</span>
                      <span>{invoice.guardian.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        </div>

        {/* Invoice Items */}
        <SlideUp>
          <Card>
            <CardContent className="p-6">
              <h2 className="font-semibold mb-4">청구 항목</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium">항목</th>
                      <th className="pb-3 font-medium text-right">단가</th>
                      <th className="pb-3 font-medium text-center">수량</th>
                      <th className="pb-3 font-medium text-right">할인</th>
                      <th className="pb-3 font-medium text-right">금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {itemTypeLabels[item.type] || item.type}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </td>
                        <td className="py-3 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 text-center">{item.quantity}</td>
                        <td className="py-3 text-right text-red-600">
                          {item.discountRate && item.discountRate > 0
                            ? `-${item.discountRate}%`
                            : item.discountAmount && item.discountAmount > 0
                              ? `-${formatCurrency(item.discountAmount)}`
                              : '-'}
                        </td>
                        <td className="py-3 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t">
                      <td colSpan={4} className="py-3 text-right font-medium">소계</td>
                      <td className="py-3 text-right">{formatCurrency(invoice.totalAmount)}</td>
                    </tr>
                    {invoice.discountAmount > 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-right text-red-600">할인</td>
                        <td className="py-2 text-right text-red-600">-{formatCurrency(invoice.discountAmount)}</td>
                      </tr>
                    )}
                    {invoice.taxAmount > 0 && (
                      <tr>
                        <td colSpan={4} className="py-2 text-right">세금</td>
                        <td className="py-2 text-right">{formatCurrency(invoice.taxAmount)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2">
                      <td colSpan={4} className="py-3 text-right text-lg font-bold">총 금액</td>
                      <td className="py-3 text-right text-lg font-bold">{formatCurrency(invoice.finalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </SlideUp>

        {/* Payment Summary & Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SlideUp>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">총 청구금액</p>
                <p className="text-2xl font-bold">{formatCurrency(invoice.finalAmount)}</p>
              </CardContent>
            </Card>
          </SlideUp>
          <SlideUp>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">수납금액</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(invoice.paidAmount)}</p>
              </CardContent>
            </Card>
          </SlideUp>
          <SlideUp>
            <Card className={invoice.dueAmount > 0 ? 'border-red-200 bg-red-50' : ''}>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-1">미수금</p>
                <p className={`text-2xl font-bold ${invoice.dueAmount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {formatCurrency(invoice.dueAmount)}
                </p>
                {invoice.dueAmount > 0 && ['PENDING', 'PARTIAL'].includes(invoice.status) && (
                  <Button className="mt-3 w-full" onClick={() => setShowPaymentModal(true)}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    수납하기
                  </Button>
                )}
              </CardContent>
            </Card>
          </SlideUp>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">결제 내역</h2>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{payment.paymentNumber}</span>
                          <Badge
                            variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}
                          >
                            {paymentStatusLabels[payment.status] || payment.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {paymentMethodLabels[payment.method] || payment.method}
                          {payment.cardCompany && ` · ${payment.cardCompany}`}
                          {payment.paidAt && ` · ${formatDateTime(payment.paidAt)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${payment.status === 'REFUNDED' ? 'text-red-600' : 'text-green-600'}`}>
                          {payment.status === 'REFUNDED' ? '-' : '+'}{formatCurrency(payment.amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        )}

        {/* Notes */}
        {(invoice.notes || invoice.internalNotes) && (
          <SlideUp>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">메모</h2>
                {invoice.notes && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">고객 메모</p>
                    <p>{invoice.notes}</p>
                  </div>
                )}
                {invoice.internalNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">내부 메모</p>
                    <p className="text-yellow-800 bg-yellow-50 p-3 rounded">{invoice.internalNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>
        )}
      </StaggerContainer>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-6">결제 처리</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">결제 금액</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    min={0}
                    max={invoice.dueAmount}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    미수금: {formatCurrency(invoice.dueAmount)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">결제 방법</label>
                  <NativeSelect
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full"
                  >
                    <option value="CASH">현금</option>
                    <option value="CARD">카드</option>
                    <option value="TRANSFER">계좌이체</option>
                    <option value="MOBILE">모바일</option>
                    <option value="INSURANCE">보험</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={isProcessing}
                >
                  취소
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={isProcessing || parseFloat(paymentAmount) <= 0}
                >
                  {isProcessing ? '처리 중...' : '결제 완료'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
