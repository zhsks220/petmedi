import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Prisma } from '@petmedi/database';
import {
  CreateNotificationDto,
  SendNotificationDto,
  UpdateNotificationSettingsDto,
  CreateNotificationTemplateDto,
  UpdateNotificationTemplateDto,
  QueryNotificationsDto,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  RegisterDeviceTokenDto,
  UpdateDeviceTokenDto,
  SendPushNotificationDto,
} from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  // =====================================================
  // 알림 관리
  // =====================================================

  async createNotification(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        hospitalId: dto.hospitalId,
        recipientId: dto.recipientId,
        type: dto.type,
        channel: dto.channel,
        title: dto.title,
        message: dto.message,
        data: dto.data as Prisma.InputJsonValue | undefined,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        status: dto.scheduledAt ? NotificationStatus.PENDING : NotificationStatus.PENDING,
      },
      include: {
        recipient: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });
  }

  async getNotifications(hospitalId: string, query: QueryNotificationsDto) {
    const { type, channel, status, recipientId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      hospitalId,
      ...(type && { type }),
      ...(channel && { channel }),
      ...(status && { status }),
      ...(recipientId && { recipientId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          recipient: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
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

  async getNotificationById(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: {
        recipient: {
          select: { id: true, name: true, email: true, phone: true },
        },
        hospital: {
          select: { id: true, name: true },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return notification;
  }

  async getUserNotifications(userId: string, unreadOnly: boolean = false) {
    const where = {
      recipientId: userId,
      ...(unreadOnly && { readAt: null }),
    };

    const [data, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: {
          hospital: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: {
          recipientId: userId,
          readAt: null,
        },
      }),
    ]);

    return {
      data,
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        recipientId: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        readAt: null,
        channel: NotificationChannel.IN_APP,
      },
      data: { readAt: new Date() },
    });
  }

  async cancelNotification(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('알림을 찾을 수 없습니다.');
    }

    if (notification.status !== NotificationStatus.PENDING) {
      throw new Error('대기 중인 알림만 취소할 수 있습니다.');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { status: NotificationStatus.CANCELLED },
    });
  }

  // =====================================================
  // 알림 발송 (실제 발송 로직)
  // =====================================================

  async sendNotification(dto: SendNotificationDto) {
    // 템플릿 조회
    const template = await this.getTemplate(
      dto.hospitalId,
      dto.type,
      dto.channel || NotificationChannel.IN_APP
    );

    if (!template) {
      this.logger.warn(`템플릿을 찾을 수 없습니다: ${dto.type} / ${dto.channel}`);
      // 템플릿이 없으면 기본 메시지 사용
    }

    // 수신자 정보 조회
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!recipient) {
      throw new NotFoundException('수신자를 찾을 수 없습니다.');
    }

    // 메시지 생성
    const { title, message } = this.generateMessage(dto.type, template, dto.data, recipient);

    // 알림 레코드 생성
    const notification = await this.createNotification({
      hospitalId: dto.hospitalId,
      recipientId: dto.recipientId,
      type: dto.type,
      channel: dto.channel || NotificationChannel.IN_APP,
      title,
      message,
      data: dto.data,
    });

    // 실제 발송 (채널에 따라)
    try {
      await this.dispatchNotification(notification, recipient);

      // 발송 성공
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
        },
      });

      return { success: true, notificationId: notification.id };
    } catch (error) {
      // 발송 실패
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : '알 수 없는 오류',
          retryCount: { increment: 1 },
        },
      });

      this.logger.error(`알림 발송 실패: ${error}`);
      return { success: false, notificationId: notification.id, error: error instanceof Error ? error.message : '알 수 없는 오류' };
    }
  }

  private async dispatchNotification(
    notification: { id: string; channel: string; title: string; message: string },
    recipient: { name: string; email: string | null; phone: string | null }
  ) {
    switch (notification.channel) {
      case NotificationChannel.EMAIL:
        await this.sendEmailNotification(notification, recipient);
        break;
      case NotificationChannel.SMS:
        await this.sendSmsNotification(notification, recipient);
        break;
      case NotificationChannel.KAKAO:
        await this.sendKakaoNotification(notification, recipient);
        break;
      case NotificationChannel.PUSH:
        await this.sendPushNotification(notification, recipient);
        break;
      case NotificationChannel.IN_APP:
        // IN_APP은 이미 DB에 저장됨
        break;
      default:
        this.logger.warn(`알 수 없는 알림 채널: ${notification.channel}`);
    }
  }

  private async sendEmailNotification(
    notification: { title: string; message: string },
    recipient: { email: string | null }
  ) {
    if (!recipient.email) {
      throw new Error('수신자 이메일이 없습니다.');
    }

    // TODO: 실제 이메일 발송 구현 (nodemailer, sendgrid 등)
    this.logger.log(`[EMAIL] To: ${recipient.email}, Subject: ${notification.title}`);
    // 개발 환경에서는 로그만 출력
  }

  private async sendSmsNotification(
    notification: { message: string },
    recipient: { phone: string | null }
  ) {
    if (!recipient.phone) {
      throw new Error('수신자 전화번호가 없습니다.');
    }

    // TODO: 실제 SMS 발송 구현 (NHN Cloud, SENS 등)
    this.logger.log(`[SMS] To: ${recipient.phone}, Message: ${notification.message}`);
    // 개발 환경에서는 로그만 출력
  }

  private async sendKakaoNotification(
    notification: { title: string; message: string },
    recipient: { phone: string | null }
  ) {
    if (!recipient.phone) {
      throw new Error('수신자 전화번호가 없습니다.');
    }

    // TODO: 카카오 알림톡 발송 구현
    this.logger.log(`[KAKAO] To: ${recipient.phone}, Title: ${notification.title}`);
    // 개발 환경에서는 로그만 출력
  }

  private async sendPushNotification(
    notification: { title: string; message: string },
     
    recipient: { name: string }
  ) {
    // TODO: FCM 푸시 알림 발송 구현
    this.logger.log(`[PUSH] To: ${recipient.name}, Title: ${notification.title}`);
    // 개발 환경에서는 로그만 출력
  }

  private generateMessage(
    type: NotificationType,
    template: { subject?: string | null; content: string } | null,
    data: Record<string, unknown> | undefined,
    recipient: { name: string }
  ): { title: string; message: string } {
    // 기본 메시지
    const defaults = this.getDefaultMessage(type, data, recipient.name);

    if (!template) {
      return defaults;
    }

    // 템플릿 변수 치환
    let title = template.subject || defaults.title;
    let message = template.content;

    const variables: Record<string, string> = {
      name: recipient.name,
      ...(data as Record<string, string> || {}),
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, String(value));
      message = message.replace(regex, String(value));
    }

    return { title, message };
  }

  private getDefaultMessage(
    type: NotificationType,
    data: Record<string, unknown> | undefined,
    recipientName: string
  ): { title: string; message: string } {
    const appointmentDate = data?.appointmentDate as string || '';
    const appointmentTime = data?.appointmentTime as string || '';
    const animalName = data?.animalName as string || '';
    const hospitalName = data?.hospitalName as string || '';
    const amount = data?.amount as number || 0;

    switch (type) {
      case NotificationType.APPOINTMENT_REMINDER:
        return {
          title: '예약 알림',
          message: `${recipientName}님, ${animalName}의 ${appointmentDate} ${appointmentTime} 예약이 있습니다. ${hospitalName}`,
        };
      case NotificationType.APPOINTMENT_CONFIRMED:
        return {
          title: '예약 확정',
          message: `${recipientName}님, ${animalName}의 예약이 확정되었습니다. ${appointmentDate} ${appointmentTime}에 방문해주세요.`,
        };
      case NotificationType.APPOINTMENT_CANCELLED:
        return {
          title: '예약 취소',
          message: `${recipientName}님, ${animalName}의 ${appointmentDate} 예약이 취소되었습니다.`,
        };
      case NotificationType.PAYMENT_REQUEST:
        return {
          title: '결제 요청',
          message: `${recipientName}님, ${amount.toLocaleString()}원의 결제가 필요합니다.`,
        };
      case NotificationType.PAYMENT_COMPLETED:
        return {
          title: '결제 완료',
          message: `${recipientName}님, ${amount.toLocaleString()}원의 결제가 완료되었습니다. 감사합니다.`,
        };
      case NotificationType.LOW_STOCK_ALERT:
        return {
          title: '재고 부족 알림',
          message: `재고가 부족합니다. 확인해주세요.`,
        };
      case NotificationType.VACCINATION_DUE:
        return {
          title: '예방접종 알림',
          message: `${recipientName}님, ${animalName}의 예방접종 예정일이 다가왔습니다.`,
        };
      case NotificationType.CHECKUP_DUE:
        return {
          title: '정기검진 알림',
          message: `${recipientName}님, ${animalName}의 정기검진 예정일이 다가왔습니다.`,
        };
      default:
        return {
          title: '알림',
          message: '새로운 알림이 있습니다.',
        };
    }
  }

  // =====================================================
  // 템플릿 관리
  // =====================================================

  async createTemplate(dto: CreateNotificationTemplateDto) {
    return this.prisma.notificationTemplate.create({
      data: {
        hospitalId: dto.hospitalId || null,
        name: dto.name,
        type: dto.type,
        channel: dto.channel,
        subject: dto.subject,
        content: dto.content,
        kakaoTemplateCode: dto.kakaoTemplateCode,
      },
    });
  }

  async getTemplates(hospitalId?: string) {
    return this.prisma.notificationTemplate.findMany({
      where: {
        OR: [
          { hospitalId: null }, // 시스템 기본 템플릿
          { hospitalId }, // 병원별 템플릿
        ],
      },
      orderBy: [{ hospitalId: 'asc' }, { type: 'asc' }],
    });
  }

  async getTemplate(hospitalId: string, type: NotificationType, channel: NotificationChannel) {
    // 병원별 템플릿 우선, 없으면 시스템 기본 템플릿
    return this.prisma.notificationTemplate.findFirst({
      where: {
        type,
        channel,
        isActive: true,
        OR: [{ hospitalId }, { hospitalId: null }],
      },
      orderBy: { hospitalId: 'desc' }, // 병원별 템플릿 우선
    });
  }

  async updateTemplate(id: string, dto: UpdateNotificationTemplateDto) {
    return this.prisma.notificationTemplate.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.notificationTemplate.delete({
      where: { id },
    });
  }

  // =====================================================
  // 설정 관리
  // =====================================================

  async getSettings(hospitalId: string) {
    let settings = await this.prisma.notificationSetting.findUnique({
      where: { hospitalId },
    });

    if (!settings) {
      // 기본 설정 생성
      settings = await this.prisma.notificationSetting.create({
        data: { hospitalId },
      });
    }

    // 민감한 정보 마스킹
    return {
      ...settings,
      smsApiKey: settings.smsApiKey ? '********' : null,
      smsApiSecret: settings.smsApiSecret ? '********' : null,
      kakaoApiKey: settings.kakaoApiKey ? '********' : null,
      emailPassword: settings.emailPassword ? '********' : null,
      fcmServerKey: settings.fcmServerKey ? '********' : null,
    };
  }

  async updateSettings(hospitalId: string, dto: UpdateNotificationSettingsDto) {
    const settings = await this.prisma.notificationSetting.upsert({
      where: { hospitalId },
      update: dto,
      create: {
        hospitalId,
        ...dto,
      },
    });

    // 민감한 정보 마스킹
    return {
      ...settings,
      smsApiKey: settings.smsApiKey ? '********' : null,
      smsApiSecret: settings.smsApiSecret ? '********' : null,
      kakaoApiKey: settings.kakaoApiKey ? '********' : null,
      emailPassword: settings.emailPassword ? '********' : null,
      fcmServerKey: settings.fcmServerKey ? '********' : null,
    };
  }

  // =====================================================
  // 예약 알림 스케줄링 (Cron Job에서 호출)
  // =====================================================

  async sendAppointmentReminders() {
    this.logger.log('예약 알림 발송 시작...');

    // 알림 발송이 필요한 예약 조회
    const now = new Date();

    // 각 병원의 알림 설정에 따라 발송
    const settings = await this.prisma.notificationSetting.findMany({
      where: {
        OR: [{ smsEnabled: true }, { kakaoEnabled: true }, { emailEnabled: true }],
      },
    });

    for (const setting of settings) {
      const reminderTime = new Date(now.getTime() + setting.appointmentReminderHours * 60 * 60 * 1000);

      // 해당 시간대의 예약 조회 (아직 알림 미발송)
      const appointments = await this.prisma.appointment.findMany({
        where: {
          hospitalId: setting.hospitalId,
          status: 'CONFIRMED',
          appointmentDate: {
            gte: now,
            lte: reminderTime,
          },
          reminderSent: false,
        },
        include: {
          animal: { select: { name: true } },
          guardian: { select: { id: true, name: true, phone: true, email: true } },
          hospital: { select: { name: true } },
        },
      });

      for (const appointment of appointments) {
        try {
          // 알림 발송
          const channel = setting.kakaoEnabled
            ? NotificationChannel.KAKAO
            : setting.smsEnabled
            ? NotificationChannel.SMS
            : NotificationChannel.EMAIL;

          await this.sendNotification({
            hospitalId: appointment.hospitalId,
            recipientId: appointment.guardianId,
            type: NotificationType.APPOINTMENT_REMINDER,
            channel,
            data: {
              appointmentId: appointment.id,
              appointmentDate: appointment.appointmentDate.toLocaleDateString('ko-KR'),
              appointmentTime: appointment.startTime,
              animalName: appointment.animal.name,
              hospitalName: appointment.hospital.name,
            },
          });

          // 알림 발송 표시
          await this.prisma.appointment.update({
            where: { id: appointment.id },
            data: {
              reminderSent: true,
              reminderSentAt: new Date(),
            },
          });

          this.logger.log(`예약 알림 발송 완료: ${appointment.id}`);
        } catch (error) {
          this.logger.error(`예약 알림 발송 실패: ${appointment.id}`, error);
        }
      }
    }

    this.logger.log('예약 알림 발송 완료');
  }

  // =====================================================
  // 통계
  // =====================================================

  async getNotificationStats(hospitalId: string, startDate?: Date, endDate?: Date) {
    const where = {
      hospitalId,
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      }),
    };

    const [total, byStatus, byChannel, byType] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.notification.groupBy({
        by: ['channel'],
        where,
        _count: true,
      }),
      this.prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byChannel: byChannel.reduce((acc, item) => {
        acc[item.channel] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  // =====================================================
  // 디바이스 토큰 관리
  // =====================================================

  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    // 기존 토큰이 있는지 확인 (동일 사용자 + 동일 토큰)
    const existingToken = await this.prisma.deviceToken.findFirst({
      where: {
        userId,
        token: dto.token,
      },
    });

    if (existingToken) {
      // 기존 토큰 업데이트 (lastUsedAt 갱신)
      return this.prisma.deviceToken.update({
        where: { id: existingToken.id },
        data: {
          platform: dto.platform,
          deviceId: dto.deviceId,
          deviceName: dto.deviceName,
          appVersion: dto.appVersion,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });
    }

    // 새 토큰 등록
    return this.prisma.deviceToken.create({
      data: {
        userId,
        token: dto.token,
        platform: dto.platform,
        deviceId: dto.deviceId,
        deviceName: dto.deviceName,
        appVersion: dto.appVersion,
      },
    });
  }

  async getUserDeviceTokens(userId: string) {
    return this.prisma.deviceToken.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async updateDeviceToken(id: string, userId: string, dto: UpdateDeviceTokenDto) {
    const deviceToken = await this.prisma.deviceToken.findFirst({
      where: { id, userId },
    });

    if (!deviceToken) {
      throw new NotFoundException('디바이스 토큰을 찾을 수 없습니다.');
    }

    return this.prisma.deviceToken.update({
      where: { id },
      data: {
        ...dto,
        lastUsedAt: new Date(),
      },
    });
  }

  async deleteDeviceToken(id: string, userId: string) {
    const deviceToken = await this.prisma.deviceToken.findFirst({
      where: { id, userId },
    });

    if (!deviceToken) {
      throw new NotFoundException('디바이스 토큰을 찾을 수 없습니다.');
    }

    return this.prisma.deviceToken.delete({
      where: { id },
    });
  }

  async deactivateDeviceToken(token: string) {
    // 토큰 비활성화 (FCM에서 invalid token 에러 시 호출)
    await this.prisma.deviceToken.updateMany({
      where: { token },
      data: { isActive: false },
    });
  }

  // =====================================================
  // FCM 푸시 알림 발송
  // =====================================================

  async sendPushToUser(dto: SendPushNotificationDto) {
    const deviceTokens = await this.getUserDeviceTokens(dto.userId);

    if (deviceTokens.length === 0) {
      this.logger.warn(`사용자 ${dto.userId}에게 등록된 디바이스 토큰이 없습니다.`);
      return { success: false, message: '등록된 디바이스 토큰이 없습니다.' };
    }

    const results = await Promise.allSettled(
      deviceTokens.map(async (deviceToken) => {
        try {
          await this.sendFcmNotification(
            deviceToken.token,
            dto.title,
            dto.body,
            dto.data,
            dto.imageUrl
          );

          // 토큰 사용 시간 업데이트
          await this.prisma.deviceToken.update({
            where: { id: deviceToken.id },
            data: { lastUsedAt: new Date() },
          });

          return { token: deviceToken.token, success: true };
        } catch (error) {
          this.logger.error(`FCM 발송 실패: ${deviceToken.token}`, error);

          // 유효하지 않은 토큰은 비활성화
          if (this.isInvalidTokenError(error)) {
            await this.deactivateDeviceToken(deviceToken.token);
          }

          return {
            token: deviceToken.token,
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류'
          };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    return {
      success: successCount > 0,
      total: deviceTokens.length,
      successCount,
      failureCount: deviceTokens.length - successCount,
    };
  }

  private async sendFcmNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string
  ) {
    // TODO: 실제 FCM 발송 구현
    // Firebase Admin SDK 사용 예시:
    // const message: admin.messaging.Message = {
    //   token,
    //   notification: { title, body, imageUrl },
    //   data,
    //   android: {
    //     notification: { channelId: 'petmedi_notifications', priority: 'high' },
    //   },
    //   apns: {
    //     payload: { aps: { sound: 'default', badge: 1 } },
    //   },
    // };
    // return admin.messaging().send(message);

    this.logger.log(`[FCM] Token: ${token.substring(0, 20)}..., Title: ${title}, Body: ${body}`);
    this.logger.debug(`[FCM] Data: ${JSON.stringify(data)}, ImageUrl: ${imageUrl}`);

    // 개발 환경에서는 성공으로 처리
    return { messageId: `dev_${Date.now()}` };
  }

  private isInvalidTokenError(error: unknown): boolean {
    // FCM 에러 코드 확인
    const errorMessage = error instanceof Error ? error.message : '';
    const invalidTokenErrors = [
      'messaging/invalid-registration-token',
      'messaging/registration-token-not-registered',
      'messaging/invalid-argument',
    ];
    return invalidTokenErrors.some((code) => errorMessage.includes(code));
  }

  // sendPushNotification 메서드 업데이트
  private async sendPushNotificationToRecipient(
    notification: { title: string; message: string },
    recipientId: string
  ) {
    try {
      await this.sendPushToUser({
        userId: recipientId,
        title: notification.title,
        body: notification.message,
      });
    } catch (error) {
      this.logger.error('푸시 알림 발송 실패', error);
      throw error;
    }
  }

  // 기존 sendPushNotification 메서드를 새 로직으로 대체
  protected async sendPushNotificationImpl(
    notification: { title: string; message: string },
    recipientId: string
  ) {
    await this.sendPushNotificationToRecipient(notification, recipientId);
  }
}
