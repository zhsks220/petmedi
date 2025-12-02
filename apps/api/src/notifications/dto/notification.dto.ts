import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsObject,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export enum NotificationType {
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  PAYMENT_REQUEST = 'PAYMENT_REQUEST',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  VACCINATION_DUE = 'VACCINATION_DUE',
  CHECKUP_DUE = 'CHECKUP_DUE',
  CUSTOM = 'CUSTOM',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  KAKAO = 'KAKAO',
  PUSH = 'PUSH',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export class CreateNotificationDto {
  @IsString()
  hospitalId: string;

  @IsString()
  recipientId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class SendNotificationDto {
  @IsString()
  hospitalId: string;

  @IsString()
  recipientId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsString()
  smsProvider?: string;

  @IsOptional()
  @IsString()
  smsApiKey?: string;

  @IsOptional()
  @IsString()
  smsApiSecret?: string;

  @IsOptional()
  @IsString()
  smsSenderId?: string;

  @IsOptional()
  @IsBoolean()
  kakaoEnabled?: boolean;

  @IsOptional()
  @IsString()
  kakaoPlusFriendId?: string;

  @IsOptional()
  @IsString()
  kakaoApiKey?: string;

  @IsOptional()
  @IsString()
  kakaoSenderKey?: string;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  emailProvider?: string;

  @IsOptional()
  @IsString()
  emailHost?: string;

  @IsOptional()
  @IsNumber()
  emailPort?: number;

  @IsOptional()
  @IsString()
  emailUser?: string;

  @IsOptional()
  @IsString()
  emailPassword?: string;

  @IsOptional()
  @IsString()
  emailFromName?: string;

  @IsOptional()
  @IsString()
  emailFromAddress?: string;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsString()
  fcmServerKey?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(72)
  appointmentReminderHours?: number;
}

export class CreateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  hospitalId?: string;

  @IsString()
  name: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  kakaoTemplateCode?: string;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  kakaoTemplateCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @IsString()
  recipientId?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

// =====================================================
// 디바이스 토큰 관련 DTO
// =====================================================

export enum DevicePlatform {
  IOS = 'IOS',
  ANDROID = 'ANDROID',
  WEB = 'WEB',
}

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class UpdateDeviceTokenDto {
  @IsOptional()
  @IsString()
  token?: string;

  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendPushNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, string>;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
