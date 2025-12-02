import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from './dto/create-product-category.dto';
import {
  CreateSupplierDto,
  UpdateSupplierDto,
} from './dto/create-supplier.dto';
import {
  CreateProductDto,
  UpdateProductDto,
} from './dto/create-product.dto';
import {
  CreateInventoryTransactionDto,
  StockAdjustmentDto,
} from './dto/create-inventory-transaction.dto';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto/create-purchase-order.dto';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ===========================
  // 카테고리 관리
  // ===========================

  @Get('categories')
  @ApiOperation({ summary: '제품 카테고리 목록 조회' })
  @ApiResponse({ status: 200, description: '카테고리 목록' })
  async getCategories(@Query('hospitalId') hospitalId: string) {
    return this.inventoryService.getCategories(hospitalId);
  }

  @Post('categories')
  @ApiOperation({ summary: '제품 카테고리 생성' })
  @ApiResponse({ status: 201, description: '카테고리가 생성되었습니다.' })
  async createCategory(@Body() dto: CreateProductCategoryDto) {
    return this.inventoryService.createCategory(dto);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '제품 카테고리 수정' })
  @ApiResponse({ status: 200, description: '카테고리가 수정되었습니다.' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.inventoryService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '제품 카테고리 삭제' })
  @ApiResponse({ status: 200, description: '카테고리가 삭제되었습니다.' })
  async deleteCategory(@Param('id') id: string) {
    return this.inventoryService.deleteCategory(id);
  }

  // ===========================
  // 공급업체 관리
  // ===========================

  @Get('suppliers')
  @ApiOperation({ summary: '공급업체 목록 조회' })
  @ApiResponse({ status: 200, description: '공급업체 목록' })
  async getSuppliers(
    @Query('hospitalId') hospitalId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getSuppliers(hospitalId, { status, search });
  }

  @Get('suppliers/:id')
  @ApiOperation({ summary: '공급업체 상세 조회' })
  @ApiResponse({ status: 200, description: '공급업체 상세 정보' })
  async getSupplierById(@Param('id') id: string) {
    return this.inventoryService.getSupplierById(id);
  }

  @Post('suppliers')
  @ApiOperation({ summary: '공급업체 등록' })
  @ApiResponse({ status: 201, description: '공급업체가 등록되었습니다.' })
  async createSupplier(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: '공급업체 수정' })
  @ApiResponse({ status: 200, description: '공급업체가 수정되었습니다.' })
  async updateSupplier(
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.inventoryService.updateSupplier(id, dto);
  }

  @Delete('suppliers/:id')
  @ApiOperation({ summary: '공급업체 삭제' })
  @ApiResponse({ status: 200, description: '공급업체가 삭제되었습니다.' })
  async deleteSupplier(@Param('id') id: string) {
    return this.inventoryService.deleteSupplier(id);
  }

  // ===========================
  // 제품 관리
  // ===========================

  @Get('products')
  @ApiOperation({ summary: '제품 목록 조회' })
  @ApiResponse({ status: 200, description: '제품 목록' })
  async getProducts(
    @Query('hospitalId') hospitalId: string,
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('lowStock') lowStock?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getProducts(hospitalId, {
      categoryId,
      supplierId,
      type,
      search,
      lowStock: lowStock === 'true',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: '제품 상세 조회' })
  @ApiResponse({ status: 200, description: '제품 상세 정보' })
  async getProductById(@Param('id') id: string) {
    return this.inventoryService.getProductById(id);
  }

  @Post('products')
  @ApiOperation({ summary: '제품 등록' })
  @ApiResponse({ status: 201, description: '제품이 등록되었습니다.' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.inventoryService.createProduct(dto);
  }

  @Put('products/:id')
  @ApiOperation({ summary: '제품 수정' })
  @ApiResponse({ status: 200, description: '제품이 수정되었습니다.' })
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.inventoryService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: '제품 삭제' })
  @ApiResponse({ status: 200, description: '제품이 삭제되었습니다.' })
  async deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }

  // ===========================
  // 재고 관리
  // ===========================

  @Get('stocks')
  @ApiOperation({ summary: '재고 현황 조회' })
  @ApiResponse({ status: 200, description: '재고 현황 목록' })
  async getStocks(
    @Query('hospitalId') hospitalId: string,
    @Query('productId') productId?: string,
    @Query('lowStock') lowStock?: string,
    @Query('expiringSoon') expiringSoon?: string,
  ) {
    return this.inventoryService.getStocks(hospitalId, {
      productId,
      lowStock: lowStock === 'true',
      expiringSoon: expiringSoon === 'true',
    });
  }

  @Post('stocks/adjust')
  @ApiOperation({ summary: '재고 수량 조정' })
  @ApiResponse({ status: 200, description: '재고가 조정되었습니다.' })
  async adjustStock(@Body() dto: StockAdjustmentDto, @Request() req: any) {
    return this.inventoryService.adjustStock(dto, req.user?.id);
  }

  // ===========================
  // 재고 거래 내역
  // ===========================

  @Get('transactions')
  @ApiOperation({ summary: '재고 거래 내역 조회' })
  @ApiResponse({ status: 200, description: '거래 내역 목록' })
  async getTransactions(
    @Query('hospitalId') hospitalId: string,
    @Query('productId') productId?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getTransactions(hospitalId, {
      productId,
      type,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Post('transactions')
  @ApiOperation({ summary: '재고 거래 등록' })
  @ApiResponse({ status: 201, description: '거래가 등록되었습니다.' })
  async createTransaction(
    @Body() dto: CreateInventoryTransactionDto,
    @Request() req: any,
  ) {
    return this.inventoryService.createTransaction(dto, req.user?.id);
  }

  // ===========================
  // 발주서 관리
  // ===========================

  @Get('purchase-orders')
  @ApiOperation({ summary: '발주서 목록 조회' })
  @ApiResponse({ status: 200, description: '발주서 목록' })
  async getPurchaseOrders(
    @Query('hospitalId') hospitalId: string,
    @Query('supplierId') supplierId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getPurchaseOrders(hospitalId, {
      supplierId,
      status,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: '발주서 상세 조회' })
  @ApiResponse({ status: 200, description: '발주서 상세 정보' })
  async getPurchaseOrderById(@Param('id') id: string) {
    return this.inventoryService.getPurchaseOrderById(id);
  }

  @Post('purchase-orders')
  @ApiOperation({ summary: '발주서 생성' })
  @ApiResponse({ status: 201, description: '발주서가 생성되었습니다.' })
  async createPurchaseOrder(
    @Body() dto: CreatePurchaseOrderDto,
    @Request() req: any,
  ) {
    return this.inventoryService.createPurchaseOrder(dto, req.user?.id);
  }

  @Put('purchase-orders/:id')
  @ApiOperation({ summary: '발주서 수정' })
  @ApiResponse({ status: 200, description: '발주서가 수정되었습니다.' })
  async updatePurchaseOrder(
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.inventoryService.updatePurchaseOrder(id, dto);
  }

  @Patch('purchase-orders/:id/approve')
  @ApiOperation({ summary: '발주서 승인' })
  @ApiResponse({ status: 200, description: '발주서가 승인되었습니다.' })
  async approvePurchaseOrder(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.approvePurchaseOrder(id, req.user?.id);
  }

  @Patch('purchase-orders/:id/receive')
  @ApiOperation({ summary: '발주 입고 처리' })
  @ApiResponse({ status: 200, description: '입고 처리가 완료되었습니다.' })
  async receivePurchaseOrder(
    @Param('id') id: string,
    @Body() dto: ReceivePurchaseOrderDto,
    @Request() req: any,
  ) {
    return this.inventoryService.receivePurchaseOrder(id, dto, req.user?.id);
  }

  @Patch('purchase-orders/:id/cancel')
  @ApiOperation({ summary: '발주서 취소' })
  @ApiResponse({ status: 200, description: '발주서가 취소되었습니다.' })
  async cancelPurchaseOrder(@Param('id') id: string, @Request() req: any) {
    return this.inventoryService.cancelPurchaseOrder(id, req.user?.id);
  }

  // ===========================
  // 대시보드 통계
  // ===========================

  @Get('stats')
  @ApiOperation({ summary: '재고 관리 통계' })
  @ApiResponse({ status: 200, description: '재고 통계 정보' })
  async getInventoryStats(@Query('hospitalId') hospitalId: string) {
    return this.inventoryService.getInventoryStats(hospitalId);
  }
}
