'use client';

import { useState, useEffect } from 'react';
import { notificationsApi, hospitalsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Bell, Mail, MessageSquare, Send, Settings, FileText, Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Hospital {
  id: string;
  name: string;
}

interface NotificationSettings {
  id: string;
  hospitalId: string;
  smsEnabled: boolean;
  smsProvider: string | null;
  kakaoEnabled: boolean;
  emailEnabled: boolean;
  emailFromName: string | null;
  emailFromAddress: string | null;
  pushEnabled: boolean;
  appointmentReminderHours: number;
}

interface NotificationTemplate {
  id: string;
  hospitalId: string | null;
  name: string;
  type: string;
  channel: string;
  subject: string | null;
  content: string;
  isActive: boolean;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  byType: Record<string, number>;
}

const NOTIFICATION_TYPES = [
  { value: 'APPOINTMENT_REMINDER', label: '예약 알림' },
  { value: 'APPOINTMENT_CONFIRMED', label: '예약 확정' },
  { value: 'APPOINTMENT_CANCELLED', label: '예약 취소' },
  { value: 'PAYMENT_REQUEST', label: '결제 요청' },
  { value: 'PAYMENT_COMPLETED', label: '결제 완료' },
  { value: 'LOW_STOCK_ALERT', label: '재고 부족' },
  { value: 'VACCINATION_DUE', label: '예방접종 알림' },
  { value: 'CHECKUP_DUE', label: '정기검진 알림' },
  { value: 'CUSTOM', label: '커스텀' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'EMAIL', label: '이메일', icon: Mail },
  { value: 'SMS', label: 'SMS', icon: MessageSquare },
  { value: 'KAKAO', label: '카카오톡', icon: Send },
  { value: 'IN_APP', label: '앱 내 알림', icon: Bell },
];

export default function NotificationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 병원 선택 (SUPER_ADMIN용)
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');

  // 템플릿 편집 모달
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'APPOINTMENT_REMINDER',
    channel: 'KAKAO',
    subject: '',
    content: '',
  });

  // 병원 목록 로드 (SUPER_ADMIN인 경우)
  useEffect(() => {
    const loadHospitals = async () => {
      if (user?.role === 'SUPER_ADMIN') {
        try {
          const response = await hospitalsApi.getAll();
          const hospitalList = response.data?.data || response.data || [];
          setHospitals(hospitalList);
          if (hospitalList.length > 0) {
            setSelectedHospitalId(hospitalList[0].id);
          }
        } catch (error) {
          console.error('Failed to load hospitals:', error);
          toast.error('병원 목록 로드 실패');
        }
      } else if (user?.hospitalId) {
        setSelectedHospitalId(user.hospitalId);
      }
    };

    if (user) {
      loadHospitals();
    }
  }, [user]);

  useEffect(() => {
    if (selectedHospitalId) {
      loadData();
    }
  }, [selectedHospitalId]);

  const loadData = async () => {
    if (!selectedHospitalId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [settingsRes, templatesRes, statsRes] = await Promise.all([
        notificationsApi.getSettings(selectedHospitalId),
        notificationsApi.getTemplates(selectedHospitalId),
        notificationsApi.getStats(selectedHospitalId),
      ]);

      setSettings(settingsRes.data);
      setTemplates(templatesRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load notification data:', error);
      toast.error('데이터 로드 실패');
      // 에러 시 빈 상태로 설정
      setSettings(null);
      setTemplates([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings || !selectedHospitalId) return;

    setSaving(true);
    try {
      await notificationsApi.updateSettings(selectedHospitalId, {
        smsEnabled: settings.smsEnabled,
        kakaoEnabled: settings.kakaoEnabled,
        emailEnabled: settings.emailEnabled,
        pushEnabled: settings.pushEnabled,
        appointmentReminderHours: settings.appointmentReminderHours,
        emailFromName: settings.emailFromName || undefined,
        emailFromAddress: settings.emailFromAddress || undefined,
      });
      toast.success('설정이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('설정 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: '',
      type: 'APPOINTMENT_REMINDER',
      channel: 'KAKAO',
      subject: '',
      content: '',
    });
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      type: template.type,
      channel: template.channel,
      subject: template.subject || '',
      content: template.content,
    });
    setTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    try {
      if (editingTemplate) {
        await notificationsApi.updateTemplate(editingTemplate.id, templateForm);
        toast.success('템플릿이 수정되었습니다.');
      } else {
        await notificationsApi.createTemplate({
          ...templateForm,
          hospitalId: selectedHospitalId,
        });
        toast.success('템플릿이 생성되었습니다.');
      }
      setTemplateDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast.error('템플릿 저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('템플릿을 삭제하시겠습니까?')) return;

    try {
      await notificationsApi.deleteTemplate(id);
      toast.success('템플릿이 삭제되었습니다.');
      loadData();
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('템플릿 삭제 실패');
    }
  };

  // 병원이 선택되지 않은 상태 처리
  if (!selectedHospitalId && !loading) {
    return (
      <StaggerContainer className="space-y-6">
        <FadeIn>
          <div>
            <h1 className="text-3xl font-bold">알림 관리</h1>
            <p className="text-muted-foreground">SMS, 카카오톡, 이메일 알림을 설정하고 관리합니다.</p>
          </div>
        </FadeIn>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">병원을 선택해주세요</h3>
            <p className="text-muted-foreground text-sm">
              {user?.role === 'SUPER_ADMIN'
                ? '알림 설정을 관리할 병원이 등록되지 않았습니다.'
                : '소속된 병원이 없습니다. 병원에 등록 후 이용해주세요.'}
            </p>
          </CardContent>
        </Card>
      </StaggerContainer>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      <FadeIn>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">알림 관리</h1>
            <p className="text-muted-foreground">SMS, 카카오톡, 이메일 알림을 설정하고 관리합니다.</p>
          </div>
          {/* SUPER_ADMIN인 경우 병원 선택 드롭다운 표시 */}
          {user?.role === 'SUPER_ADMIN' && hospitals.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">병원 선택:</Label>
              <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="병원을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map((hospital) => (
                    <SelectItem key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </FadeIn>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <FadeIn>
          <TabsList>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              설정
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              템플릿
            </TabsTrigger>
            <TabsTrigger value="stats">
              <Bell className="h-4 w-4 mr-2" />
              통계
            </TabsTrigger>
          </TabsList>
        </FadeIn>

        {/* 설정 탭 */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* 채널 설정 */}
          <SlideUp delay={0.1}>
            <Card>
              <CardHeader>
                <CardTitle>알림 채널 설정</CardTitle>
                <CardDescription>사용할 알림 채널을 활성화하세요.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* SMS 설정 */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                    <div>
                      <h3 className="font-semibold">SMS 문자 알림</h3>
                      <p className="text-sm text-muted-foreground">
                        NHN Cloud, SENS 등의 SMS 서비스를 연동합니다.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.smsEnabled || false}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => prev && { ...prev, smsEnabled: checked })
                    }
                  />
                </div>

                {/* 카카오톡 설정 */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Send className="h-8 w-8 text-yellow-500" />
                    <div>
                      <h3 className="font-semibold">카카오 알림톡</h3>
                      <p className="text-sm text-muted-foreground">
                        카카오 비즈니스 채널을 통해 알림톡을 발송합니다.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.kakaoEnabled || false}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => prev && { ...prev, kakaoEnabled: checked })
                    }
                  />
                </div>

                {/* 이메일 설정 */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Mail className="h-8 w-8 text-green-500" />
                    <div>
                      <h3 className="font-semibold">이메일 알림</h3>
                      <p className="text-sm text-muted-foreground">
                        SMTP 또는 이메일 서비스를 통해 이메일을 발송합니다.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.emailEnabled || false}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => prev && { ...prev, emailEnabled: checked })
                    }
                  />
                </div>

                {/* 푸시 알림 설정 */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Bell className="h-8 w-8 text-purple-500" />
                    <div>
                      <h3 className="font-semibold">푸시 알림</h3>
                      <p className="text-sm text-muted-foreground">
                        앱 푸시 알림을 발송합니다. (FCM 연동 필요)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings?.pushEnabled || false}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => prev && { ...prev, pushEnabled: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* 예약 알림 설정 */}
          <SlideUp delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle>예약 알림 설정</CardTitle>
                <CardDescription>예약 알림 발송 시간을 설정합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="reminderHours">예약 전 알림 시간 (시간)</Label>
                  <Select
                    value={String(settings?.appointmentReminderHours || 24)}
                    onValueChange={(value) =>
                      setSettings((prev) => prev && { ...prev, appointmentReminderHours: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1시간 전</SelectItem>
                      <SelectItem value="2">2시간 전</SelectItem>
                      <SelectItem value="3">3시간 전</SelectItem>
                      <SelectItem value="6">6시간 전</SelectItem>
                      <SelectItem value="12">12시간 전</SelectItem>
                      <SelectItem value="24">24시간 전 (하루 전)</SelectItem>
                      <SelectItem value="48">48시간 전 (이틀 전)</SelectItem>
                      <SelectItem value="72">72시간 전 (3일 전)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* 이메일 발신자 설정 */}
          {settings?.emailEnabled && (
            <SlideUp delay={0.3}>
              <Card>
                <CardHeader>
                  <CardTitle>이메일 발신자 설정</CardTitle>
                  <CardDescription>이메일 발송 시 표시될 발신자 정보입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emailFromName">발신자 이름</Label>
                    <Input
                      id="emailFromName"
                      value={settings?.emailFromName || ''}
                      onChange={(e) =>
                        setSettings((prev) => prev && { ...prev, emailFromName: e.target.value })
                      }
                      placeholder="예: 펫메디 동물병원"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emailFromAddress">발신자 이메일</Label>
                    <Input
                      id="emailFromAddress"
                      type="email"
                      value={settings?.emailFromAddress || ''}
                      onChange={(e) =>
                        setSettings((prev) => prev && { ...prev, emailFromAddress: e.target.value })
                      }
                      placeholder="예: noreply@hospital.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          )}

          <FadeIn>
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                설정 저장
              </Button>
            </div>
          </FadeIn>
        </TabsContent>

        {/* 템플릿 탭 */}
        <TabsContent value="templates" className="space-y-6 mt-6">
          <SlideUp delay={0.1}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>알림 템플릿</CardTitle>
                  <CardDescription>알림 유형별 메시지 템플릿을 관리합니다.</CardDescription>
                </div>
                <Button onClick={handleCreateTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  템플릿 추가
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>채널</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          등록된 템플릿이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      templates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>
                            {NOTIFICATION_TYPES.find((t) => t.value === template.type)?.label || template.type}
                          </TableCell>
                          <TableCell>
                            {NOTIFICATION_CHANNELS.find((c) => c.value === template.channel)?.label || template.channel}
                          </TableCell>
                          <TableCell>
                            <Badge variant={template.isActive ? 'default' : 'secondary'}>
                              {template.isActive ? '활성' : '비활성'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </SlideUp>

          {/* 템플릿 변수 가이드 */}
          <SlideUp delay={0.2}>
            <Card>
              <CardHeader>
                <CardTitle>템플릿 변수 가이드</CardTitle>
                <CardDescription>템플릿에서 사용할 수 있는 변수입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-primary">{'{{name}}'}</code>
                    <p className="text-muted-foreground mt-1">보호자 이름</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-primary">{'{{animalName}}'}</code>
                    <p className="text-muted-foreground mt-1">동물 이름</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-primary">{'{{appointmentDate}}'}</code>
                    <p className="text-muted-foreground mt-1">예약 날짜</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-primary">{'{{appointmentTime}}'}</code>
                    <p className="text-muted-foreground mt-1">예약 시간</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-primary">{'{{hospitalName}}'}</code>
                    <p className="text-muted-foreground mt-1">병원 이름</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <code className="text-primary">{'{{amount}}'}</code>
                    <p className="text-muted-foreground mt-1">금액</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        </TabsContent>

        {/* 통계 탭 */}
        <TabsContent value="stats" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <SlideUp delay={0.1}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    총 발송
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                </CardContent>
              </Card>
            </SlideUp>
            <SlideUp delay={0.2}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    발송 완료
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {stats?.byStatus?.SENT || 0}
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
            <SlideUp delay={0.3}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    발송 실패
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {stats?.byStatus?.FAILED || 0}
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
            <SlideUp delay={0.4}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    대기 중
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.byStatus?.PENDING || 0}
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </div>

          {/* 채널별 통계 */}
          <SlideUp delay={0.5}>
            <Card>
              <CardHeader>
                <CardTitle>채널별 발송 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {NOTIFICATION_CHANNELS.map((channel) => {
                    const Icon = channel.icon;
                    return (
                      <div key={channel.value} className="flex items-center gap-3 p-4 border rounded-lg">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">{channel.label}</p>
                          <p className="text-xl font-bold">
                            {stats?.byChannel?.[channel.value] || 0}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* 유형별 통계 */}
          <SlideUp delay={0.6}>
            <Card>
              <CardHeader>
                <CardTitle>알림 유형별 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>알림 유형</TableHead>
                      <TableHead className="text-right">발송 건수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {NOTIFICATION_TYPES.map((type) => (
                      <TableRow key={type.value}>
                        <TableCell>{type.label}</TableCell>
                        <TableCell className="text-right font-medium">
                          {stats?.byType?.[type.value] || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </SlideUp>
        </TabsContent>
      </Tabs>

      {/* 템플릿 편집 다이얼로그 */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '템플릿 수정' : '템플릿 추가'}
            </DialogTitle>
            <DialogDescription>
              알림 메시지 템플릿을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>템플릿 이름</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                placeholder="예: 예약 알림 - 카카오톡"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>알림 유형</Label>
                <Select
                  value={templateForm.type}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>채널</Label>
                <Select
                  value={templateForm.channel}
                  onValueChange={(value) => setTemplateForm({ ...templateForm, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {templateForm.channel === 'EMAIL' && (
              <div className="grid gap-2">
                <Label>제목</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                  placeholder="이메일 제목"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label>메시지 내용</Label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                placeholder="{{name}}님, {{animalName}}의 예약이 {{appointmentDate}} {{appointmentTime}}에 있습니다."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveTemplate} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StaggerContainer>
  );
}
