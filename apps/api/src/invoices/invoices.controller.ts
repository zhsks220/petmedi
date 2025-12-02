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
import { InvoicesService } from './invoices.service';
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
} from './dto/invoice.dto';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ===========================
  // 청구서 CRUD
  // ===========================

  @Post()
  @ApiOperation({ summary: '청구서 생성' })
  @ApiResponse({ status: 201, description: '청구서가 생성되었습니다.' })
  async create(@Body() dto: CreateInvoiceDto, @Request() req: any) {
    return this.invoicesService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '청구서 목록 조회' })
  @ApiResponse({ status: 200, description: '청구서 목록' })
  async findAll(@Query() query: InvoiceQueryDto, @Request() req: any) {
    return this.invoicesService.findAll(query, req.user.id, req.user.role);
  }

  @Get('stats')
  @ApiOperation({ summary: '수납 통계 조회' })
  @ApiResponse({ status: 200, description: '수납 통계' })
  async getStats(@Query() query: InvoiceStatsQueryDto) {
    return this.invoicesService.getStats(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '청구서 상세 조회' })
  @ApiResponse({ status: 200, description: '청구서 상세 정보' })
  @ApiResponse({ status: 404, description: '청구서를 찾을 수 없습니다.' })
  async findById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '청구서 수정' })
  @ApiResponse({ status: 200, description: '청구서가 수정되었습니다.' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
    @Request() req: any,
  ) {
    return this.invoicesService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: '청구서 삭제' })
  @ApiResponse({ status: 200, description: '청구서가 삭제되었습니다.' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.invoicesService.delete(id, req.user.id, req.user.role);
  }

  // ===========================
  // 청구서 항목 관리
  // ===========================

  @Post(':invoiceId/items')
  @ApiOperation({ summary: '청구서 항목 추가' })
  @ApiResponse({ status: 201, description: '항목이 추가되었습니다.' })
  async addItem(
    @Param('invoiceId') invoiceId: string,
    @Body() dto: CreateInvoiceItemDto,
  ) {
    return this.invoicesService.addItem(invoiceId, dto);
  }

  @Put('items/:itemId')
  @ApiOperation({ summary: '청구서 항목 수정' })
  @ApiResponse({ status: 200, description: '항목이 수정되었습니다.' })
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    return this.invoicesService.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: '청구서 항목 삭제' })
  @ApiResponse({ status: 200, description: '항목이 삭제되었습니다.' })
  async deleteItem(@Param('itemId') itemId: string) {
    return this.invoicesService.deleteItem(itemId);
  }

  // ===========================
  // 결제 관리
  // ===========================

  @Post('payments')
  @ApiOperation({ summary: '결제 등록' })
  @ApiResponse({ status: 201, description: '결제가 등록되었습니다.' })
  async createPayment(@Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.invoicesService.createPayment(dto, req.user.id);
  }

  @Get('payments/list')
  @ApiOperation({ summary: '결제 내역 조회' })
  @ApiResponse({ status: 200, description: '결제 내역 목록' })
  async findPayments(@Query() query: PaymentQueryDto, @Request() req: any) {
    return this.invoicesService.findPayments(query, req.user.id, req.user.role);
  }

  @Patch('payments/:paymentId/refund')
  @ApiOperation({ summary: '결제 환불' })
  @ApiResponse({ status: 200, description: '환불이 처리되었습니다.' })
  async refundPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: RefundPaymentDto,
    @Request() req: any,
  ) {
    return this.invoicesService.refundPayment(paymentId, dto, req.user.id);
  }
}
