'use client';

import { useState, useEffect } from 'react';
import { notificationsApi, hospitalsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
  Button,
  Input,
  Label,
  Switch,
  Tabs, TabsContent, TabsList, TabsTrigger,
  Badge,
  Textarea,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui';
import { Bell, Mail, MessageSquare, Send, Settings, FileText, Plus, Pencil, Trash2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
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
      <div className="flex flex-col h-full bg-slate-50">
        <PageHeader
          title="알림 관리"
          description="SMS, 카카오톡, 이메일 알림을 설정하고 관리합니다"
          icon={Bell}
        />
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <StaggerContainer className="max-w-7xl mx-auto space-y-6">
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
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="알림 관리"
        description="SMS, 카카오톡, 이메일 알림을 설정하고 관리합니다"
        icon={Bell}
      >
        {/* SUPER_ADMIN인 경우 병원 선택 드롭다운 표시 */}
        {user?.role === 'SUPER_ADMIN' && hospitals.length > 0 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-slate-500 whitespace-nowrap">병원 선택:</Label>
            <Select value={selectedHospitalId} onValueChange={setSelectedHospitalId}>
              <SelectTrigger className="w-[200px] h-9 bg-white">
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
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <FadeIn>
              <TabsList className="bg-white border border-slate-200">
                <TabsTrigger value="settings" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                  <Settings className="h-4 w-4 mr-2" />
                  설정
                </TabsTrigger>
                <TabsTrigger value="templates" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                  <FileText className="h-4 w-4 mr-2" />
                  템플릿
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">
                  <Bell className="h-4 w-4 mr-2" />
                  통계
                </TabsTrigger>
              </TabsList>
            </FadeIn>

            {/* 설정 탭 */}
            <TabsContent value="settings" className="space-y-6 mt-6">
              {/* 채널 설정 */}
              <SlideUp delay={0.1}>
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>알림 채널 설정</CardTitle>
                    <CardDescription>사용할 알림 채널을 활성화하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* SMS 설정 */}
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">SMS 문자 알림</h3>
                          <p className="text-sm text-slate-500">
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
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-yellow-50 rounded-lg">
                          <Send className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">카카오 알림톡</h3>
                          <p className="text-sm text-slate-500">
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
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                          <Mail className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">이메일 알림</h3>
                          <p className="text-sm text-slate-500">
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
                    <div className="flex items-center justify-between p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-purple-50 rounded-lg">
                          <Bell className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">푸시 알림</h3>
                          <p className="text-sm text-slate-500">
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
                <Card className="border-slate-200 shadow-sm">
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
                  <Card className="border-slate-200 shadow-sm">
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
                          className="max-w-md"
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
                          className="max-w-md"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </SlideUp>
              )}

              <FadeIn>
                <div className="flex justify-end sticky bottom-6 z-10">
                  <Button onClick={handleSaveSettings} disabled={saving} className="shadow-lg">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    설정 저장
                  </Button>
                </div>
              </FadeIn>
            </TabsContent>

            {/* 템플릿 탭 */}
            <TabsContent value="templates" className="space-y-6 mt-6">
              <SlideUp delay={0.1}>
                <Card className="border-slate-200 shadow-sm border-0">
                  <div className="flex flex-row items-center justify-between p-6 pb-0">
                    <div>
                      <CardTitle>알림 템플릿</CardTitle>
                      <CardDescription>알림 유형별 메시지 템플릿을 관리합니다.</CardDescription>
                    </div>
                    <Button onClick={handleCreateTemplate} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      템플릿 추가
                    </Button>
                  </div>
                  <CardContent className="p-0 mt-6">
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
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
                              <TableCell colSpan={5} className="text-center py-12 text-slate-500">
                                <FileText className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                등록된 템플릿이 없습니다.
                              </TableCell>
                            </TableRow>
                          ) : (
                            templates.map((template) => (
                              <TableRow key={template.id} className="hover:bg-slate-50/50">
                                <TableCell className="font-medium">{template.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-normal text-slate-600">
                                    {NOTIFICATION_TYPES.find((t) => t.value === template.type)?.label || template.type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {NOTIFICATION_CHANNELS.find((c) => c.value === template.channel)?.icon && (
                                      (() => {
                                        const Icon = NOTIFICATION_CHANNELS.find((c) => c.value === template.channel)!.icon;
                                        return <Icon className="h-4 w-4 text-slate-500" />
                                      })()
                                    )}
                                    <span className="text-sm text-slate-600">
                                      {NOTIFICATION_CHANNELS.find((c) => c.value === template.channel)?.label || template.channel}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={template.isActive ? 'default' : 'secondary'} className={template.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
                                    {template.isActive ? '활성' : '비활성'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditTemplate(template)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Pencil className="h-4 w-4 text-slate-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>

              {/* 템플릿 변수 가이드 */}
              <SlideUp delay={0.2}>
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>템플릿 변수 가이드</CardTitle>
                    <CardDescription>템플릿에서 사용할 수 있는 변수입니다.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{'{{name}}'}</code>
                        <p className="text-slate-500 mt-1 text-xs">보호자 이름</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{'{{animalName}}'}</code>
                        <p className="text-slate-500 mt-1 text-xs">동물 이름</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{'{{appointmentDate}}'}</code>
                        <p className="text-slate-500 mt-1 text-xs">예약 날짜</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{'{{appointmentTime}}'}</code>
                        <p className="text-slate-500 mt-1 text-xs">예약 시간</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{'{{hospitalName}}'}</code>
                        <p className="text-slate-500 mt-1 text-xs">병원 이름</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">{'{{amount}}'}</code>
                        <p className="text-slate-500 mt-1 text-xs">금액</p>
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
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        총 발송
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-slate-900">{stats?.total || 0}</div>
                    </CardContent>
                  </Card>
                </SlideUp>
                <SlideUp delay={0.2}>
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        발송 완료
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-emerald-600">
                        {stats?.byStatus?.SENT || 0}
                      </div>
                    </CardContent>
                  </Card>
                </SlideUp>
                <SlideUp delay={0.3}>
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500">
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
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-slate-500">
                        대기 중
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-amber-600">
                        {stats?.byStatus?.PENDING || 0}
                      </div>
                    </CardContent>
                  </Card>
                </SlideUp>
              </div>

              {/* 채널별 통계 */}
              <SlideUp delay={0.5}>
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>채널별 발송 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {NOTIFICATION_CHANNELS.map((channel) => {
                        const Icon = channel.icon;
                        return (
                          <div key={channel.value} className="flex items-center gap-3 p-4 border border-slate-100 rounded-lg bg-slate-50/50">
                            <div className="p-2 bg-white rounded-md border border-slate-100">
                              <Icon className="h-5 w-5 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 font-medium">{channel.label}</p>
                              <p className="text-xl font-bold text-slate-900">
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
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle>알림 유형별 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableHead>알림 유형</TableHead>
                            <TableHead className="text-right">발송 건수</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {NOTIFICATION_TYPES.map((type) => (
                            <TableRow key={type.value} className="hover:bg-slate-50/50">
                              <TableCell>{type.label}</TableCell>
                              <TableCell className="text-right font-medium text-slate-900">
                                {stats?.byType?.[type.value] || 0}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
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
                {['EMAIL', 'IN_APP'].includes(templateForm.channel) && (
                  <div className="grid gap-2">
                    <Label>제목</Label>
                    <Input
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="알림 제목을 입력하세요"
                    />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label>내용</Label>
                  <Textarea
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    placeholder={`알림 내용을 입력하세요.\n변수: {{name}}, {{animalName}}, {{appointmentDate}} 등`}
                    rows={5}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>취소</Button>
                <Button onClick={handleSaveTemplate} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  저장
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </StaggerContainer>
      </div>
    </div>
  );
}
