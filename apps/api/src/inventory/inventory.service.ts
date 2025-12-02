import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
  CreateSupplierDto,
  UpdateSupplierDto,
  CreateProductDto,
  UpdateProductDto,
  CreateInventoryTransactionDto,
  StockAdjustmentDto,
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ===== Product Category =====
  async getCategories(hospitalId: string) {
    return this.prisma.productCategory.findMany({
      where: { hospitalId },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(dto: CreateProductCategoryDto) {
    return this.prisma.productCategory.create({
      data: dto,
      include: { parent: true },
    });
  }

  async updateCategory(id: string, dto: UpdateProductCategoryDto) {
    return this.prisma.productCategory.update({
      where: { id },
      data: dto,
      include: { parent: true },
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { _count: { select: { products: true, children: true } } },
    });
    if (!category) throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    if (category._count.products > 0 || category._count.children > 0) {
      throw new BadRequestException('하위 품목 또는 카테고리가 있어 삭제할 수 없습니다.');
    }
    return this.prisma.productCategory.delete({ where: { id } });
  }

  // ===== Supplier =====
  async getSuppliers(hospitalId: string, options?: { status?: string; search?: string }) {
    const where: any = { hospitalId };
    if (options?.status) where.status = options.status;
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { products: true, purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getSupplierById(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: { take: 10 },
        purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) throw new NotFoundException('공급업체를 찾을 수 없습니다.');
    return supplier;
  }

  async createSupplier(dto: CreateSupplierDto) {
    const code = await this.generateSupplierCode(dto.hospitalId);
    return this.prisma.supplier.create({
      data: { ...dto, code },
    });
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto) {
    return this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    if (!supplier) throw new NotFoundException('공급업체를 찾을 수 없습니다.');
    if (supplier._count.purchaseOrders > 0) {
      throw new BadRequestException('발주 내역이 있어 삭제할 수 없습니다.');
    }
    return this.prisma.supplier.delete({ where: { id } });
  }

  private async generateSupplierCode(hospitalId: string): Promise<string> {
    const count = await this.prisma.supplier.count({ where: { hospitalId } });
    return `SUP-${String(count + 1).padStart(3, '0')}`;
  }

  // ===== Product =====
  async getProducts(hospitalId: string, options?: {
    categoryId?: string;
    supplierId?: string;
    type?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { categoryId, supplierId, type, search, lowStock, page = 1, limit = 20 } = options || {};
    const where: any = { hospitalId };
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          supplier: true,
          inventoryStocks: {
            select: {
              quantity: true,
              reservedQty: true,
              availableQty: true,
              expirationDate: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // 총 재고 계산
    const dataWithStock = data.map((product) => {
      const totalStock = product.inventoryStocks.reduce((sum, s) => sum + s.quantity, 0);
      const nearExpiry = product.inventoryStocks.some((s) => {
        if (!s.expirationDate) return false;
        const daysUntilExpiry = Math.floor(
          (s.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
      });
      return { ...product, totalStock, nearExpiry, lowStock: totalStock <= product.minStockLevel };
    });

    return {
      data: dataWithStock,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        inventoryStocks: true,
        inventoryTransactions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!product) throw new NotFoundException('품목을 찾을 수 없습니다.');
    return product;
  }

  async createProduct(dto: CreateProductDto) {
    const code = await this.generateProductCode(dto.hospitalId, dto.type || 'OTHER');
    return this.prisma.product.create({
      data: { ...dto, code },
      include: { category: true, supplier: true },
    });
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: true, supplier: true },
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { inventoryTransactions: true } } },
    });
    if (!product) throw new NotFoundException('품목을 찾을 수 없습니다.');
    if (product._count.inventoryTransactions > 0) {
      throw new BadRequestException('거래 내역이 있어 삭제할 수 없습니다. 비활성화를 권장합니다.');
    }
    return this.prisma.product.delete({ where: { id } });
  }

  private async generateProductCode(hospitalId: string, type: string): Promise<string> {
    const prefix = this.getProductTypePrefix(type);
    const count = await this.prisma.product.count({
      where: { hospitalId, code: { startsWith: prefix } },
    });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private getProductTypePrefix(type: string): string {
    const prefixes: Record<string, string> = {
      MEDICATION: 'MED',
      VACCINE: 'VAC',
      SUPPLIES: 'SUP',
      EQUIPMENT: 'EQP',
      FOOD: 'FOD',
      SUPPLEMENT: 'SMP',
      OTHER: 'OTH',
    };
    return prefixes[type] || 'OTH';
  }

  // ===== Inventory Stock =====
  async getStocks(hospitalId: string, options?: {
    productId?: string;
    lowStock?: boolean;
    expiringSoon?: boolean;
  }) {
    const { productId, lowStock: lowStockOnly, expiringSoon: expiringOnly } = options || {};
    let where: any = { hospitalId };
    if (productId) where.productId = productId;

    const stocks = await this.prisma.inventoryStock.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            unit: true,
            minStockLevel: true,
            sellingPrice: true,
          },
        },
      },
      orderBy: { product: { name: 'asc' } },
    });

    let result = stocks;
    if (lowStockOnly) {
      result = result.filter((s) => s.quantity <= (s.product.minStockLevel || 0));
    }
    if (expiringOnly) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      result = result.filter((s) => s.expirationDate && s.expirationDate <= thirtyDaysFromNow);
    }

    return result;
  }

  async adjustStock(dto: StockAdjustmentDto, userId: string) {
    const { hospitalId, productId, newQuantity, reason, lotNumber } = dto;

    return this.prisma.$transaction(async (tx) => {
      // 현재 재고 조회 또는 생성
      let stock = await tx.inventoryStock.findFirst({
        where: { hospitalId, productId, lotNumber: lotNumber || null },
      });

      const previousQty = stock?.quantity || 0;
      const quantityDiff = newQuantity - previousQty;

      if (!stock) {
        stock = await tx.inventoryStock.create({
          data: {
            hospitalId,
            productId,
            quantity: newQuantity,
            availableQty: newQuantity,
            lotNumber,
          },
        });
      } else {
        stock = await tx.inventoryStock.update({
          where: { id: stock.id },
          data: {
            quantity: newQuantity,
            availableQty: newQuantity - stock.reservedQty,
            lastCountedAt: new Date(),
          },
        });
      }

      // 트랜잭션 기록
      const transactionNumber = await this.generateTransactionNumber(tx, hospitalId);
      await tx.inventoryTransaction.create({
        data: {
          transactionNumber,
          hospitalId,
          productId,
          type: 'ADJUSTMENT',
          quantity: quantityDiff,
          previousQty,
          currentQty: newQuantity,
          lotNumber,
          notes: reason,
          processedBy: userId,
        },
      });

      return stock;
    });
  }

  // ===== Inventory Transaction =====
  async getTransactions(hospitalId: string, options?: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { productId, type, startDate, endDate, page = 1, limit = 20 } = options || {};
    const where: any = { hospitalId };
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) where.processedAt.gte = new Date(startDate);
      if (endDate) where.processedAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.inventoryTransaction.findMany({
        where,
        include: {
          product: { select: { id: true, code: true, name: true, unit: true } },
        },
        orderBy: { processedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createTransaction(dto: CreateInventoryTransactionDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { hospitalId, productId, type, quantity, unitCost, lotNumber, expirationDate, notes } =
        dto;

      // 현재 재고 조회
      let stock = await tx.inventoryStock.findFirst({
        where: { hospitalId, productId, lotNumber: lotNumber || null },
      });

      const previousQty = stock?.quantity || 0;
      let newQty = previousQty;

      // 입출고 유형에 따른 수량 계산
      const isInbound = ['PURCHASE', 'RETURN', 'TRANSFER_IN', 'INITIAL'].includes(type);
      if (isInbound) {
        newQty = previousQty + Math.abs(quantity);
      } else {
        newQty = previousQty - Math.abs(quantity);
        if (newQty < 0) {
          throw new BadRequestException('재고가 부족합니다.');
        }
      }

      // 재고 업데이트 또는 생성
      if (!stock) {
        stock = await tx.inventoryStock.create({
          data: {
            hospitalId,
            productId,
            quantity: newQty,
            availableQty: newQty,
            lotNumber,
            expirationDate: expirationDate ? new Date(expirationDate) : null,
          },
        });
      } else {
        stock = await tx.inventoryStock.update({
          where: { id: stock.id },
          data: {
            quantity: newQty,
            availableQty: newQty - stock.reservedQty,
            expirationDate: expirationDate ? new Date(expirationDate) : stock.expirationDate,
          },
        });
      }

      // 트랜잭션 기록
      const transactionNumber = await this.generateTransactionNumber(tx, hospitalId);
      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionNumber,
          hospitalId,
          productId,
          type: type as any,
          quantity: isInbound ? Math.abs(quantity) : -Math.abs(quantity),
          unitCost,
          totalCost: unitCost ? unitCost * Math.abs(quantity) : null,
          previousQty,
          currentQty: newQty,
          lotNumber,
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          notes,
          referenceType: dto.referenceType,
          referenceId: dto.referenceId,
          processedBy: userId,
        },
        include: { product: true },
      });

      return transaction;
    });
  }

  private async generateTransactionNumber(tx: any, hospitalId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const seq = await tx.inventoryTransactionSequence.upsert({
      where: { date: dateStr },
      create: { date: dateStr, sequence: 1 },
      update: { sequence: { increment: 1 } },
    });

    return `TXN-${dateStr}-${String(seq.sequence).padStart(4, '0')}`;
  }

  // ===== Purchase Order =====
  async getPurchaseOrders(hospitalId: string, options?: {
    supplierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { supplierId, status, startDate, endDate, page = 1, limit = 20 } = options || {};
    const where: any = { hospitalId };
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, code: true, name: true } },
          items: {
            include: { product: { select: { id: true, code: true, name: true, unit: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPurchaseOrderById(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!order) throw new NotFoundException('발주서를 찾을 수 없습니다.');
    return order;
  }

  async createPurchaseOrder(dto: CreatePurchaseOrderDto, userId: string) {
    const orderNumber = await this.generatePurchaseOrderNumber(dto.hospitalId);

    // 금액 계산
    let subtotal = 0;
    const itemsWithAmount = dto.items.map((item, index) => {
      const amount = item.quantity * item.unitPrice;
      subtotal += amount;
      return { ...item, amount, sortOrder: index };
    });

    const taxAmount = subtotal * 0.1; // 10% VAT
    const totalAmount = subtotal + taxAmount;

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber,
        hospitalId: dto.hospitalId,
        supplierId: dto.supplierId,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : null,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : null,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        subtotal,
        taxAmount,
        totalAmount,
        createdBy: userId,
        items: {
          create: itemsWithAmount,
        },
      },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
  }

  async updatePurchaseOrder(id: string, dto: UpdatePurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('발주서를 찾을 수 없습니다.');
    if (!['DRAFT', 'PENDING'].includes(order.status)) {
      throw new BadRequestException('초안 또는 대기 상태의 발주서만 수정할 수 있습니다.');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...dto,
        orderDate: dto.orderDate ? new Date(dto.orderDate) : undefined,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
      },
      include: { supplier: true, items: { include: { product: true } } },
    });
  }

  async approvePurchaseOrder(id: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('발주서를 찾을 수 없습니다.');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('대기 상태의 발주서만 승인할 수 있습니다.');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });
  }

  async receivePurchaseOrder(id: string, dto: ReceivePurchaseOrderDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('발주서를 찾을 수 없습니다.');
      if (!['APPROVED', 'ORDERED', 'PARTIAL'].includes(order.status)) {
        throw new BadRequestException('승인된 발주서만 입고 처리할 수 있습니다.');
      }

      let allReceived = true;

      for (const receiveItem of dto.items) {
        const orderItem = order.items.find((i) => i.id === receiveItem.itemId);
        if (!orderItem) continue;

        // 발주 품목 업데이트
        const newReceivedQty = orderItem.receivedQty + receiveItem.receivedQuantity;
        await tx.purchaseOrderItem.update({
          where: { id: orderItem.id },
          data: {
            receivedQty: newReceivedQty,
            lotNumber: receiveItem.lotNumber || orderItem.lotNumber,
            expirationDate: receiveItem.expirationDate
              ? new Date(receiveItem.expirationDate)
              : orderItem.expirationDate,
          },
        });

        if (newReceivedQty < orderItem.quantity) {
          allReceived = false;
        }

        // 재고 입고 트랜잭션 생성
        await this.createTransaction(
          {
            hospitalId: order.hospitalId,
            productId: orderItem.productId,
            type: 'PURCHASE' as const,
            quantity: receiveItem.receivedQuantity,
            unitCost: orderItem.unitPrice,
            lotNumber: receiveItem.lotNumber,
            expirationDate: receiveItem.expirationDate,
            referenceType: 'PURCHASE_ORDER',
            referenceId: order.id,
            notes: dto.notes,
          } as CreateInventoryTransactionDto,
          userId
        );
      }

      // 발주서 상태 업데이트
      const newStatus = allReceived ? 'RECEIVED' : 'PARTIAL';
      return tx.purchaseOrder.update({
        where: { id },
        data: {
          status: newStatus,
          receivedDate: allReceived ? new Date() : null,
        },
        include: { supplier: true, items: { include: { product: true } } },
      });
    });
  }

  async cancelPurchaseOrder(id: string, _userId?: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('발주서를 찾을 수 없습니다.');
    if (['RECEIVED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException('입고 완료 또는 취소된 발주서는 취소할 수 없습니다.');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  private async generatePurchaseOrderNumber(hospitalId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const seq = await this.prisma.purchaseOrderSequence.upsert({
      where: { date: dateStr },
      create: { date: dateStr, sequence: 1 },
      update: { sequence: { increment: 1 } },
    });

    return `PO-${dateStr}-${String(seq.sequence).padStart(4, '0')}`;
  }

  // ===== Dashboard Stats =====
  async getInventoryStats(hospitalId: string) {
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      expiringProducts,
      totalStockValue,
      recentTransactions,
      pendingOrders,
    ] = await Promise.all([
      this.prisma.product.count({ where: { hospitalId } }),
      this.prisma.product.count({ where: { hospitalId, isActive: true } }),
      this.prisma.$queryRaw`
        SELECT COUNT(DISTINCT p.id) as count
        FROM products p
        LEFT JOIN inventory_stocks s ON s.product_id = p.id
        WHERE p.hospital_id = ${hospitalId}
        AND p.is_active = true
        AND COALESCE(s.quantity, 0) <= p.min_stock_level
      `,
      this.prisma.inventoryStock.count({
        where: {
          hospitalId,
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      this.prisma.$queryRaw`
        SELECT COALESCE(SUM(s.quantity * p.cost_price), 0) as total
        FROM inventory_stocks s
        JOIN products p ON s.product_id = p.id
        WHERE s.hospital_id = ${hospitalId}
      `,
      this.prisma.inventoryTransaction.count({
        where: {
          hospitalId,
          processedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.purchaseOrder.count({
        where: { hospitalId, status: { in: ['PENDING', 'APPROVED', 'ORDERED'] } },
      }),
    ]);

    return {
      totalProducts,
      activeProducts,
      lowStockProducts: Number((lowStockProducts as any)[0]?.count || 0),
      expiringProducts,
      totalStockValue: Number((totalStockValue as any)[0]?.total || 0),
      recentTransactions,
      pendingOrders,
    };
  }
}
