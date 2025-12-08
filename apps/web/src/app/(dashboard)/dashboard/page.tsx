'use client';

import { useEffect, useState } from 'react';
import {
  PawPrint,
  FileText,
  Building2,
  Users,
  TrendingUp,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  Clock,
  LayoutGrid,
  Filter,
  Download,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { dashboardApi, hospitalsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  summary: {
    totalAnimals: number;
    totalAppointments: number;
    totalRevenue: number;
    pendingPayments: number;
  };
  appointments: {
    today: number;
    thisWeek: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  };
  inventory: {
    lowStockCount: number;
    expiringSoonCount: number;
    totalItems: number;
  };
  recentRecords: Array<{
    id: string;
    visitDate: string;
    chiefComplaint: string;
    animal: { name: string };
  }>;
  todayAppointments: Array<{
    id: string;
    scheduledTime: string;
    status: string;
    animal: { name: string };
    owner: { name: string };
  }>;
}

interface WeeklyTrend {
  date: string;
  count: number;
  dayName: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  monthName: string;
}

interface SpeciesDistribution {
  species: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

interface Hospital {
  id: string;
  name: string;
}

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1'];

const SPECIES_LABELS: Record<string, string> = {
  DOG: '강아지',
  CAT: '고양이',
  BIRD: '조류',
  RABBIT: '토끼',
  HAMSTER: '햄스터',
  REPTILE: '파충류',
  OTHER: '기타',
  unknown: '기타',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [speciesDistribution, setSpeciesDistribution] = useState<SpeciesDistribution[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch hospitals
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await hospitalsApi.getAll();
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        setHospitals(data);
        if (data.length > 0) {
          setSelectedHospitalId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch hospitals:', error);
      }
    };
    fetchHospitals();
  }, []);

  // Fetch data
  useEffect(() => {
    if (!selectedHospitalId) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        if (!dashboardApi) throw new Error('API not initialized');

        const [statsRes, trendRes, revenueRes, speciesRes] = await Promise.all([
          dashboardApi.getStats(selectedHospitalId),
          dashboardApi.getWeeklyAppointmentTrend(selectedHospitalId),
          dashboardApi.getMonthlyRevenueTrend(selectedHospitalId, 6),
          dashboardApi.getSpeciesDistribution(selectedHospitalId),
        ]);

        setStats(statsRes?.data);
        setWeeklyTrend(trendRes?.data || []);
        setMonthlyRevenue(revenueRes?.data || []);
        setSpeciesDistribution(speciesRes?.data || []);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedHospitalId]);

  const statCards = [
    {
      title: '등록 동물',
      value: stats?.summary.totalAnimals || 0,
      icon: PawPrint,
    },
    {
      title: '오늘 예약',
      value: stats?.appointments.today || 0,
      icon: Calendar,
    },
    {
      title: '월 매출',
      value: stats?.summary.totalRevenue || 0,
      icon: DollarSign,
      format: 'currency',
    },
    {
      title: '미수금',
      value: stats?.summary.pendingPayments || 0,
      icon: AlertTriangle,
      format: 'currency',
    },
  ];

  const formatValue = (value: number, format?: string) => {
    if (format === 'currency') return `₩${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="대시보드"
        description="병원 현황을 한눈에 확인하세요"
        icon={LayoutGrid}
      >
        {hospitals.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
        <Button variant="outline" size="sm" className="h-8 gap-2 hidden sm:flex">
          <Filter className="h-3.5 w-3.5" />
          필터
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-2 hidden sm:flex">
          <Download className="h-3.5 w-3.5" />
          내보내기
        </Button>
      </PageHeader>

      <StaggerContainer className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Top Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <SlideUp key={stat.title} delay={i * 0.05}>
                <Card className="hover:border-slate-300 transition-colors">
                  <CardContent className="p-5 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                      <h4 className="text-2xl font-semibold mt-2 text-slate-900">
                        {isLoading ? '-' : formatValue(stat.value, stat.format)}
                      </h4>
                    </div>
                    <div className="p-2 bg-slate-100 rounded-md text-slate-600">
                      <stat.icon className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 space-y-8">
              <SlideUp delay={0.2}>
                <Card>
                  <CardHeader>
                    <CardTitle>예약 추이</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full mt-4">
                      {isLoading ? (
                        <div className="h-full flex items-center justify-center text-slate-400">로딩 중...</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={weeklyTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                              dataKey="dayName"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              dy={10}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke="#0f172a"
                              strokeWidth={2}
                              dot={{ r: 4, fill: '#0f172a' }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>

              {/* Today's Appointments List */}
              <SlideUp delay={0.3}>
                <Card>
                  <CardHeader>
                    <CardTitle>오늘의 예약</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="py-8 text-center text-slate-400">로딩 중...</div>
                    ) : !stats?.todayAppointments?.length ? (
                      <div className="py-12 text-center text-slate-500 text-sm">오늘 예정된 예약이 없습니다.</div>
                    ) : (
                      <div className="space-y-1">
                        {stats.todayAppointments.map((apt) => (
                          <div key={apt.id} className="group flex items-center justify-between p-3 hover:bg-slate-50 rounded-md transition-colors border border-transparent hover:border-slate-100">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs ring-4 ring-white group-hover:ring-slate-50 transition-all">
                                {apt.animal?.name?.[0] || 'A'}
                              </div>
                              <div>
                                <p className="font-medium text-sm text-slate-900">{apt.animal?.name}</p>
                                <p className="text-xs text-slate-500">{apt.owner?.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-semibold text-slate-900">
                                {new Date(apt.scheduledTime).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                              <span className={
                                `inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-1 ${apt.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' :
                                  apt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                                    'bg-slate-100 text-slate-600'
                                }`
                              }>
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </SlideUp>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <SlideUp delay={0.4}>
                <Card>
                  <CardHeader>
                    <CardTitle>종 분포</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] w-full flex items-center justify-center">
                      {/* Simplified Pie Chart */}
                      {speciesDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={speciesDistribution}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="count"
                            >
                              {speciesDistribution.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-sm text-slate-400">데이터가 없습니다</div>
                      )}
                    </div>
                    {/* Legend */}
                    <div className="mt-4 space-y-2">
                      {speciesDistribution.slice(0, 4).map((item, i) => (
                        <div key={item.species} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-slate-600">{SPECIES_LABELS[item.species] || item.species}</span>
                          </div>
                          <span className="font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>

              <SlideUp delay={0.5}>
                <Card className="bg-slate-900 text-white border-none">
                  <CardHeader className="border-slate-800">
                    <CardTitle className="text-white">월별 매출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[150px] mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyRevenue}>
                          <Bar dataKey="revenue" fill="#fff" radius={[4, 4, 0, 0]} opacity={0.8} />
                          <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ background: '#1e293b', border: 'none', color: '#fff', borderRadius: '8px' }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">이번 달 매출</p>
                        <p className="text-xl font-bold mt-1">
                          {formatValue(stats?.summary.totalRevenue || 0, 'currency')}
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SlideUp>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Recent Records */}
            <SlideUp delay={0.6}>
              <Card>
                <CardHeader>
                  <CardTitle>최근 진료 기록</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-8 text-center text-slate-400">로딩 중...</div>
                  ) : !stats?.recentRecords?.length ? (
                    <div className="py-12 text-center text-slate-500 text-sm">최근 진료 기록이 없습니다.</div>
                  ) : (
                    <div className="space-y-4">
                      {stats.recentRecords.map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-500 border border-slate-200">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{record.animal?.name}</p>
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">{record.chiefComplaint}</p>
                            </div>
                          </div>
                          <div className="text-xs text-slate-400 font-medium">
                            {formatDate(record.visitDate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </SlideUp>

            {/* Quick Actions */}
            <SlideUp delay={0.7}>
              <Card>
                <CardHeader>
                  <CardTitle>빠른 실행</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { title: '동물 등록', icon: PawPrint, href: '/dashboard/animals/new', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
                      { title: '예약 등록', icon: Calendar, href: '/dashboard/appointments/new', color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100' },
                      { title: '진료 기록', icon: FileText, href: '/dashboard/medical-records/new', color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100' },
                      { title: '수납/청구', icon: DollarSign, href: '/dashboard/billing', color: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100' },
                    ].map((action) => (
                      <Link
                        key={action.title}
                        href={action.href}
                        className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all border border-transparent ${action.bg}`}
                      >
                        <action.icon className={`h-6 w-6 mb-2 ${action.color}`} />
                        <span className={`text-xs font-semibold ${action.color}`}>{action.title}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </div>
        </div>
      </StaggerContainer>
    </div>
  );
}
