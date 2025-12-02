import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsIn } from 'class-validator';

const InventoryTransactionTypes = [
  'PURCHASE',
  'SALE',
  'ADJUSTMENT',
  'RETURN',
  'EXPIRED',
  'DAMAGED',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'INITIAL',
] as const;

export class CreateInventoryTransactionDto {
  @IsString()
  hospitalId: string;

  @IsString()
  productId: string;

  @IsIn(InventoryTransactionTypes)
  type: string;

  @IsNumber()
  quantity: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class StockAdjustmentDto {
  @IsString()
  hospitalId: string;

  @IsString()
  productId: string;

  @IsNumber()
  newQuantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;
}
