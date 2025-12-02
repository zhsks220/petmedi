import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  CreateNotificationDto,
  SendNotificationDto,
  UpdateNotificationSettingsDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  QueryNotificationsDto,
  RegisterDeviceTokenDto,
  UpdateDeviceTokenDto,
  SendPushNotificationDto,
} from './dto/notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ==================== 알림 관리 ====================

  @Post()
  async createNotification(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.createNotification(dto);
  }

  @Get('hospital/:hospitalId')
  async getNotifications(
    @Param('hospitalId') hospitalId: string,
    @Query() query: QueryNotificationsDto,
  ) {
    return this.notificationsService.getNotifications(hospitalId, query);
  }

  @Get(':id')
  async getNotificationById(@Param('id') id: string) {
    return this.notificationsService.getNotificationById(id);
  }

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      userId,
      unreadOnly === 'true',
    );
  }

  @Get('my/list')
  async getMyNotifications(
    @Request() req: { user: { id: string } },
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user.id,
      unreadOnly === 'true',
    );
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Put('user/:userId/read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Put('my/read-all')
  @HttpCode(HttpStatus.OK)
  async markMyAllAsRead(@Request() req: { user: { id: string } }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelNotification(@Param('id') id: string) {
    return this.notificationsService.cancelNotification(id);
  }

  // ==================== 알림 발송 ====================

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendNotification(dto);
  }

  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  async resendNotification(@Param('id') id: string) {
    const notification = await this.notificationsService.getNotificationById(id);
    if (!notification) {
      return { success: false, message: '알림을 찾을 수 없습니다.' };
    }
    return this.notificationsService.sendNotification({
      hospitalId: notification.hospitalId,
      recipientId: notification.recipientId,
      type: notification.type as any,
      channel: notification.channel as any,
      data: notification.data as Record<string, unknown> | undefined,
    });
  }

  // ==================== 템플릿 관리 ====================

  @Post('templates')
  async createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    return this.notificationsService.createTemplate(dto);
  }

  @Get('templates/hospital/:hospitalId')
  async getTemplates(@Param('hospitalId') hospitalId: string) {
    return this.notificationsService.getTemplates(hospitalId);
  }

  @Get('templates/default')
  async getDefaultTemplates() {
    return this.notificationsService.getTemplates();
  }

  @Put('templates/:id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationTemplateDto,
  ) {
    return this.notificationsService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@Param('id') id: string) {
    return this.notificationsService.updateTemplate(id, { isActive: false });
  }

  // ==================== 설정 관리 ====================

  @Get('settings/:hospitalId')
  async getSettings(@Param('hospitalId') hospitalId: string) {
    return this.notificationsService.getSettings(hospitalId);
  }

  @Put('settings/:hospitalId')
  async updateSettings(
    @Param('hospitalId') hospitalId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.notificationsService.updateSettings(hospitalId, dto);
  }

  // ==================== 통계 ====================

  @Get('stats/:hospitalId')
  async getNotificationStats(
    @Param('hospitalId') hospitalId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getNotificationStats(
      hospitalId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  // ==================== 예약 리마인더 (수동 트리거) ====================

  @Post('reminders/send')
  @HttpCode(HttpStatus.OK)
  async sendAppointmentReminders() {
    return this.notificationsService.sendAppointmentReminders();
  }

  // ==================== 디바이스 토큰 관리 (푸시 알림용) ====================

  @Post('devices/register')
  @HttpCode(HttpStatus.CREATED)
  async registerDeviceToken(
    @Request() req: { user: { id: string } },
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(req.user.id, dto);
  }

  @Get('devices/my')
  async getMyDeviceTokens(@Request() req: { user: { id: string } }) {
    return this.notificationsService.getUserDeviceTokens(req.user.id);
  }

  @Put('devices/:id')
  async updateDeviceToken(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
    @Body() dto: UpdateDeviceTokenDto,
  ) {
    return this.notificationsService.updateDeviceToken(id, req.user.id, dto);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  async deleteDeviceToken(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.notificationsService.deleteDeviceToken(id, req.user.id);
  }

  // ==================== 푸시 알림 발송 ====================

  @Post('push/send')
  @HttpCode(HttpStatus.OK)
  async sendPushNotification(@Body() dto: SendPushNotificationDto) {
    return this.notificationsService.sendPushToUser(dto);
  }

  @Post('push/test')
  @HttpCode(HttpStatus.OK)
  async sendTestPushNotification(@Request() req: { user: { id: string } }) {
    return this.notificationsService.sendPushToUser({
      userId: req.user.id,
      title: '테스트 푸시 알림',
      body: 'PetMedi 앱 푸시 알림 테스트입니다.',
      data: { type: 'test', timestamp: new Date().toISOString() },
    });
  }
}
