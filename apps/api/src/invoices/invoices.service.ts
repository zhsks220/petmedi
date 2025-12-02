import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
  CreateInvoiceItemDto,
  UpdateInvoiceItemDto,
  CreatePaymentDto,
  RefundPaymentDto,
  PaymentQueryDto,
  InvoiceStatsQueryDto,
  InvoiceStatus,
  PaymentStatus,
} from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // ===========================
  // 청구서 CRUD
  // ===========================

  async create(dto: CreateInvoiceDto, userId: string) {
    // 병원 존재 확인
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
    });
    if (!hospital) {
      throw new NotFoundException('병원을 찾을 수 없습니다');
    }

    // 동물 존재 확인
    const animal = await this.prisma.animal.findUnique({
      where: { id: dto.animalId },
    });
    if (!animal) {
      throw new NotFoundException('동물을 찾을 수 없습니다');
    }

    // 보호자 존재 확인
    const guardian = await this.prisma.user.findUnique({
      where: { id: dto.guardianId },
    });
    if (!guardian) {
      throw new NotFoundException('보호자를 찾을 수 없습니다');
    }

    // 청구서 번호 생성
    const invoiceNumber = await this.generateInvoiceNumber();

    // 항목 계산
    const items = dto.items.map((item, index) => {
      const amount = item.quantity * item.unitPrice;
      let finalAmount = amount;

      if (item.discountRate) {
        finalAmount = amount * (1 - item.discountRate / 100);
      } else if (item.discountAmount) {
        finalAmount = amount - item.discountAmount;
      }

      return {
        ...item,
        amount,
        finalAmount: Math.max(0, finalAmount),
        sortOrder: item.sortOrder ?? index,
      };
    });

    // 총액 계산
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = items.reduce(
      (sum, item) => sum + (item.amount - item.finalAmount),
      0,
    );
    const totalAmount = subtotal - discountAmount;

    // 청구서 생성
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        hospitalId: dto.hospitalId,
        animalId: dto.animalId,
        guardianId: dto.guardianId,
        medicalRecordId: dto.medicalRecordId,
        appointmentId: dto.appointmentId,
        subtotal,
        discountAmount,
        totalAmount,
        dueAmount: totalAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        status: 'DRAFT',
        createdBy: userId,
        items: {
          create: items.map((item) => ({
            type: item.type,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            discountRate: item.discountRate,
            discountAmount: item.discountAmount,
            finalAmount: item.finalAmount,
            sortOrder: item.sortOrder,
          })),
        },
      },
      include: {
        hospital: { select: { id: true, name: true } },
        animal: { select: { id: true, code: true, name: true, species: true } },
        guardian: { select: { id: true, name: true, phone: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: true,
      },
    });

    return invoice;
  }

  async findAll(query: InvoiceQueryDto, userId: string, userRole: string) {
    const {
      hospitalId,
      guardianId,
      animalId,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // 권한에 따른 필터링
    if (userRole === 'GUARDIAN') {
      where.guardianId = userId;
    } else if (['VET', 'STAFF', 'HOSPITAL_ADMIN'].includes(userRole)) {
      const staffHospital = await this.prisma.hospitalStaff.findFirst({
        where: { userId, isActive: true },
      });
      if (staffHospital) {
        where.hospitalId = staffHospital.hospitalId;
      }
    }
    // SUPER_ADMIN은 모든 청구서 조회 가능

    // 추가 필터
    if (hospitalId) where.hospitalId = hospitalId;
    if (guardianId) where.guardianId = guardianId;
    if (animalId) where.animalId = animalId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.issueDate = {};
      if (startDate) where.issueDate.gte = new Date(startDate);
      if (endDate) where.issueDate.lte = new Date(endDate);
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          hospital: { select: { id: true, name: true } },
          animal: { select: { id: true, code: true, name: true, species: true } },
          guardian: { select: { id: true, name: true, phone: true } },
          items: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { payments: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, name: true, phone: true, address: true } },
        animal: {
          select: {
            id: true,
            code: true,
            name: true,
            species: true,
            breed: true,
            birthDate: true,
          },
        },
        guardian: { select: { id: true, name: true, phone: true, email: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('청구서를 찾을 수 없습니다');
    }

    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, userId: string, userRole: string) {
    const invoice = await this.findById(id);

    // 권한 확인
    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'STAFF'].includes(userRole)) {
      throw new ForbiddenException('청구서를 수정할 권한이 없습니다');
    }

    // 결제 완료된 청구서는 제한된 수정만 가능
    if (['PAID', 'REFUNDED'].includes(invoice.status)) {
      throw new BadRequestException('결제가 완료된 청구서는 수정할 수 없습니다');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.status && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
      },
      include: {
        hospital: { select: { id: true, name: true } },
        animal: { select: { id: true, code: true, name: true } },
        guardian: { select: { id: true, name: true } },
        items: { orderBy: { sortOrder: 'asc' } },
        payments: true,
      },
    });

    return updated;
  }

  async delete(id: string, userId: string, userRole: string) {
    const invoice = await this.findById(id);

    // 권한 확인
    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(userRole)) {
      throw new ForbiddenException('청구서를 삭제할 권한이 없습니다');
    }

    // 결제가 진행된 청구서는 삭제 불가
    if (invoice.paidAmount > 0) {
      throw new BadRequestException('결제가 진행된 청구서는 삭제할 수 없습니다');
    }

    await this.prisma.invoice.delete({ where: { id } });

    return { message: '청구서가 삭제되었습니다' };
  }

  // ===========================
  // 청구서 항목 관리
  // ===========================

  async addItem(invoiceId: string, dto: CreateInvoiceItemDto) {
    const invoice = await this.findById(invoiceId);

    if (['PAID', 'REFUNDED', 'CANCELLED'].includes(invoice.status)) {
      throw new BadRequestException('이 청구서에는 항목을 추가할 수 없습니다');
    }

    const amount = dto.quantity * dto.unitPrice;
    let finalAmount = amount;

    if (dto.discountRate) {
      finalAmount = amount * (1 - dto.discountRate / 100);
    } else if (dto.discountAmount) {
      finalAmount = amount - dto.discountAmount;
    }

    // 항목 추가
    const item = await this.prisma.invoiceItem.create({
      data: {
        invoiceId,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        amount,
        discountRate: dto.discountRate,
        discountAmount: dto.discountAmount,
        finalAmount: Math.max(0, finalAmount),
        sortOrder: dto.sortOrder ?? (invoice.items.length + 1),
      },
    });

    // 청구서 금액 재계산
    await this.recalculateInvoice(invoiceId);

    return item;
  }

  async updateItem(itemId: string, dto: UpdateInvoiceItemDto) {
    const item = await this.prisma.invoiceItem.findUnique({
      where: { id: itemId },
      include: { invoice: true },
    });

    if (!item) {
      throw new NotFoundException('항목을 찾을 수 없습니다');
    }

    if (['PAID', 'REFUNDED', 'CANCELLED'].includes(item.invoice.status)) {
      throw new BadRequestException('이 청구서의 항목은 수정할 수 없습니다');
    }

    const quantity = dto.quantity ?? item.quantity;
    const unitPrice = dto.unitPrice ?? item.unitPrice;
    const amount = quantity * unitPrice;
    let finalAmount = amount;

    const discountRate = dto.discountRate ?? item.discountRate;
    const discountAmount = dto.discountAmount ?? item.discountAmount;

    if (discountRate) {
      finalAmount = amount * (1 - discountRate / 100);
    } else if (discountAmount) {
      finalAmount = amount - discountAmount;
    }

    const updated = await this.prisma.invoiceItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        amount,
        finalAmount: Math.max(0, finalAmount),
      },
    });

    // 청구서 금액 재계산
    await this.recalculateInvoice(item.invoiceId);

    return updated;
  }

  async deleteItem(itemId: string) {
    const item = await this.prisma.invoiceItem.findUnique({
      where: { id: itemId },
      include: { invoice: true },
    });

    if (!item) {
      throw new NotFoundException('항목을 찾을 수 없습니다');
    }

    if (['PAID', 'REFUNDED', 'CANCELLED'].includes(item.invoice.status)) {
      throw new BadRequestException('이 청구서의 항목은 삭제할 수 없습니다');
    }

    await this.prisma.invoiceItem.delete({ where: { id: itemId } });

    // 청구서 금액 재계산
    await this.recalculateInvoice(item.invoiceId);

    return { message: '항목이 삭제되었습니다' };
  }

  // ===========================
  // 결제 관리
  // ===========================

  async createPayment(dto: CreatePaymentDto, userId: string) {
    const invoice = await this.findById(dto.invoiceId);

    if (['PAID', 'CANCELLED', 'REFUNDED'].includes(invoice.status)) {
      throw new BadRequestException('이 청구서에는 결제를 추가할 수 없습니다');
    }

    if (dto.amount > invoice.dueAmount) {
      throw new BadRequestException(
        `결제 금액이 미결제 금액(${invoice.dueAmount.toLocaleString()}원)을 초과합니다`,
      );
    }

    // 결제 번호 생성
    const paymentNumber = await this.generatePaymentNumber();

    // 결제 생성
    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber,
        invoiceId: dto.invoiceId,
        hospitalId: invoice.hospitalId,
        amount: dto.amount,
        method: dto.method,
        status: 'COMPLETED',
        cardNumber: dto.cardNumber,
        cardCompany: dto.cardCompany,
        cardApprovalNo: dto.cardApprovalNo,
        cardInstallment: dto.cardInstallment,
        notes: dto.notes,
        paidAt: new Date(),
        processedBy: userId,
      },
    });

    // 청구서 결제 금액 업데이트
    const newPaidAmount = invoice.paidAmount + dto.amount;
    const newDueAmount = invoice.totalAmount - newPaidAmount;

    let newStatus: InvoiceStatus = invoice.status as InvoiceStatus;
    if (newDueAmount <= 0) {
      newStatus = InvoiceStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = InvoiceStatus.PARTIAL;
    }

    await this.prisma.invoice.update({
      where: { id: dto.invoiceId },
      data: {
        paidAmount: newPaidAmount,
        dueAmount: Math.max(0, newDueAmount),
        status: newStatus,
        ...(newDueAmount <= 0 && { paidAt: new Date() }),
      },
    });

    return payment;
  }

  async refundPayment(paymentId: string, dto: RefundPaymentDto, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { invoice: true },
    });

    if (!payment) {
      throw new NotFoundException('결제 내역을 찾을 수 없습니다');
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('완료된 결제만 환불할 수 있습니다');
    }

    if (dto.amount > payment.amount) {
      throw new BadRequestException('환불 금액이 결제 금액을 초과합니다');
    }

    // 결제 환불 처리
    const refundedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundAmount: dto.amount,
        refundReason: dto.reason,
        refundedAt: new Date(),
      },
    });

    // 청구서 금액 업데이트
    const newPaidAmount = payment.invoice.paidAmount - dto.amount;
    const newDueAmount = payment.invoice.totalAmount - newPaidAmount;

    let newStatus: InvoiceStatus;
    if (newPaidAmount <= 0) {
      newStatus = InvoiceStatus.REFUNDED;
    } else {
      newStatus = InvoiceStatus.PARTIAL;
    }

    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: Math.max(0, newPaidAmount),
        dueAmount: newDueAmount,
        status: newStatus,
        paidAt: null,
      },
    });

    return refundedPayment;
  }

  async findPayments(query: PaymentQueryDto, userId: string, userRole: string) {
    const {
      hospitalId,
      invoiceId,
      status,
      method,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where: any = {};

    // 권한에 따른 필터링
    if (['VET', 'STAFF', 'HOSPITAL_ADMIN'].includes(userRole)) {
      const staffHospital = await this.prisma.hospitalStaff.findFirst({
        where: { userId, isActive: true },
      });
      if (staffHospital) {
        where.hospitalId = staffHospital.hospitalId;
      }
    }

    // 추가 필터
    if (hospitalId) where.hospitalId = hospitalId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (status) where.status = status;
    if (method) where.method = method;

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = new Date(startDate);
      if (endDate) where.paidAt.lte = new Date(endDate);
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              guardian: { select: { id: true, name: true } },
              animal: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ===========================
  // 통계
  // ===========================

  async getStats(query: InvoiceStatsQueryDto) {
    const { hospitalId, startDate, endDate } = query;

    const dateFilter: any = {};
    if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
    }

    // 청구서 통계
    const invoiceStats = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: {
        hospitalId,
        ...(Object.keys(dateFilter).length > 0 && { issueDate: dateFilter }),
      },
      _count: { status: true },
      _sum: { totalAmount: true, paidAmount: true },
    });

    // 결제 통계
    const paymentStats = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        hospitalId,
        status: 'COMPLETED',
        ...(Object.keys(dateFilter).length > 0 && { paidAt: dateFilter }),
      },
      _count: { method: true },
      _sum: { amount: true },
    });

    // 전체 요약
    const [totalInvoices, totalPaid, totalDue] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          hospitalId,
          ...(Object.keys(dateFilter).length > 0 && { issueDate: dateFilter }),
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: {
          hospitalId,
          status: 'PAID',
          ...(Object.keys(dateFilter).length > 0 && { paidAt: dateFilter }),
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: {
          hospitalId,
          status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
          ...(Object.keys(dateFilter).length > 0 && { issueDate: dateFilter }),
        },
        _sum: { dueAmount: true },
        _count: true,
      }),
    ]);

    // 일별 매출 (최근 30일)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailySales = await this.prisma.payment.findMany({
      where: {
        hospitalId,
        status: 'COMPLETED',
        paidAt: { gte: thirtyDaysAgo },
      },
      select: { paidAt: true, amount: true },
    });

    // 일별로 집계
    const dailySalesMap = dailySales.reduce(
      (acc, payment) => {
        if (payment.paidAt) {
          const dateKey: string = payment.paidAt.toISOString().split('T')[0]!;
          acc[dateKey] = (acc[dateKey] || 0) + payment.amount;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      summary: {
        totalInvoiceCount: totalInvoices._count,
        totalInvoiceAmount: totalInvoices._sum.totalAmount || 0,
        paidInvoiceCount: totalPaid._count,
        paidAmount: totalPaid._sum.totalAmount || 0,
        unpaidInvoiceCount: totalDue._count,
        unpaidAmount: totalDue._sum.dueAmount || 0,
      },
      byStatus: invoiceStats.reduce((acc, item) => {
        acc[item.status] = {
          count: item._count.status,
          totalAmount: item._sum.totalAmount || 0,
          paidAmount: item._sum.paidAmount || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; totalAmount: number; paidAmount: number }>),
      byPaymentMethod: paymentStats.reduce((acc, item) => {
        acc[item.method] = {
          count: item._count.method,
          amount: item._sum.amount || 0,
        };
        return acc;
      }, {} as Record<string, { count: number; amount: number }>),
      dailySales: dailySalesMap,
    };
  }

  // ===========================
  // Helper Methods
  // ===========================

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const sequence = await this.prisma.invoiceSequence.upsert({
      where: { date: dateStr },
      update: { sequence: { increment: 1 } },
      create: { date: dateStr, sequence: 1 },
    });

    return `INV-${dateStr}-${sequence.sequence.toString().padStart(4, '0')}`;
  }

  private async generatePaymentNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const sequence = await this.prisma.paymentSequence.upsert({
      where: { date: dateStr },
      update: { sequence: { increment: 1 } },
      create: { date: dateStr, sequence: 1 },
    });

    return `PAY-${dateStr}-${sequence.sequence.toString().padStart(4, '0')}`;
  }

  private async recalculateInvoice(invoiceId: string): Promise<void> {
    const items = await this.prisma.invoiceItem.findMany({
      where: { invoiceId },
    });

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discountAmount = items.reduce(
      (sum, item) => sum + (item.amount - item.finalAmount),
      0,
    );
    const totalAmount = subtotal - discountAmount;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const dueAmount = totalAmount - invoice.paidAmount;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal,
        discountAmount,
        totalAmount,
        dueAmount: Math.max(0, dueAmount),
      },
    });
  }
}
