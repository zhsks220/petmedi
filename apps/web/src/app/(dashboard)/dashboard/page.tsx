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
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { dashboardApi, hospitalsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { StaggerContainer, SlideUp, FadeIn, ScaleIn } from '@/components/ui/motion-wrapper';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const SPECIES_LABELS: Record<string, string> = {
  DOG: '강아지',
  CAT: '고양이',
  BIRD: '조류',
  RABBIT: '토끼',
  HAMSTER: '햄스터',
  REPTILE: '파충류',
  OTHER: '기타',
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrend[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [speciesDistribution, setSpeciesDistribution] = useState<SpeciesDistribution[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch hospitals for selection
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

  // Fetch dashboard data when hospital is selected
  useEffect(() => {
    if (!selectedHospitalId) {
      setIsLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Ensure APIs are available
        if (!dashboardApi) {
          console.error('Dashboard API is not initialized');
          return;
        }

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
      title: '등록된 동물',
      value: stats?.summary.totalAnimals || 0,
      icon: PawPrint,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '오늘 예약',
      value: stats?.appointments.today || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '이번 달 매출',
      value: stats?.summary.totalRevenue || 0,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      format: 'currency',
    },
    {
      title: '미수금',
      value: stats?.summary.pendingPayments || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      format: 'currency',
    },
  ];

  const appointmentStatusCards = [
    { title: '대기중', value: stats?.appointments.pending || 0, color: 'text-yellow-600' },
    { title: '확정됨', value: stats?.appointments.confirmed || 0, color: 'text-blue-600' },
    { title: '완료됨', value: stats?.appointments.completed || 0, color: 'text-green-600' },
    { title: '취소됨', value: stats?.appointments.cancelled || 0, color: 'text-red-600' },
  ];

  const formatValue = (value: number, format?: string) => {
    if (format === 'currency') {
      return `₩${value.toLocaleString()}`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="대시보드" />

      <StaggerContainer className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Hospital Selector */}
        {hospitals.length > 1 && (
          <FadeIn className="flex items-center gap-4">
            <label className="text-sm font-medium text-muted-foreground">병원 선택:</label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </FadeIn>
        )}

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <SlideUp key={stat.title} delay={index * 0.1}>
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-1">
                        {isLoading ? '-' : formatValue(stat.value, stat.format)}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          ))}
        </div>

        {/* Appointment Status & Inventory Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointment Status */}
          <SlideUp delay={0.2}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  예약 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {appointmentStatusCards.map((item) => (
                    <div key={item.title} className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className={`text-2xl font-bold ${item.color}`}>
                        {isLoading ? '-' : item.value}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{item.title}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Inventory Alerts */}
          <SlideUp delay={0.3}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  재고 알림
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium">재고 부족</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {isLoading ? '-' : stats?.inventory.lowStockCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-red-600" />
                      <span className="font-medium">유통기한 임박</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {isLoading ? '-' : stats?.inventory.expiringSoonCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">전체 품목</span>
                    </div>
                    <span className="text-2xl font-bold text-gray-600">
                      {isLoading ? '-' : stats?.inventory.totalItems || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Appointment Trend */}
          <SlideUp delay={0.4}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  주간 예약 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : weeklyTrend.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    데이터가 없습니다
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={weeklyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dayName" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        strokeWidth={2}
                        dot={{ fill: '#8884d8' }}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </SlideUp>

          {/* Monthly Revenue Trend */}
          <SlideUp delay={0.5}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  월별 매출 추이
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : monthlyRevenue.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    데이터가 없습니다
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthName" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [`₩${value.toLocaleString()}`, '매출']}
                      />
                      <Bar dataKey="revenue" fill="#82ca9d" animationDuration={1500} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </SlideUp>
        </div>

        {/* Bottom Row: Species Distribution, Today's Appointments, Recent Records */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Species Distribution */}
          <SlideUp delay={0.6}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5" />
                  종별 환자 분포
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                  </div>
                ) : speciesDistribution.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    데이터가 없습니다
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={speciesDistribution}
                          dataKey="count"
                          nameKey="species"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(props) => {
                            const { name, percent } = props;
                            return `${SPECIES_LABELS[name as string] || name} ${((percent || 0) * 100).toFixed(0)}%`;
                          }}
                          animationDuration={1500}
                        >
                          {speciesDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            value,
                            SPECIES_LABELS[name] || name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </SlideUp>

          {/* Today's Appointments */}
          <SlideUp delay={0.7}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  오늘 예약
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : !stats?.todayAppointments || stats.todayAppointments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    오늘 예약이 없습니다
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {stats.todayAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <PawPrint className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{apt.animal?.name || '미등록'}</p>
                            <p className="text-sm text-muted-foreground">
                              {apt.owner?.name || '보호자 미등록'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {new Date(apt.scheduledTime).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${apt.status === 'CONFIRMED'
                              ? 'bg-blue-100 text-blue-700'
                              : apt.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : apt.status === 'CANCELLED'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                          >
                            {apt.status === 'CONFIRMED'
                              ? '확정'
                              : apt.status === 'COMPLETED'
                                ? '완료'
                                : apt.status === 'CANCELLED'
                                  ? '취소'
                                  : '대기'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>

          {/* Recent Records */}
          <SlideUp delay={0.8}>
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  최근 진료 기록
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                    ))}
                  </div>
                ) : !stats?.recentRecords || stats.recentRecords.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    진료 기록이 없습니다
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {stats.recentRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{record.animal?.name || '미등록'}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {record.chiefComplaint}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(record.visitDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </SlideUp>
        </div>

        {/* Quick Actions */}
        <SlideUp delay={0.9}>
          <Card>
            <CardHeader>
              <CardTitle>빠른 작업</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.a
                  href="/dashboard/animals/new"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <PawPrint className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="font-medium text-blue-900">동물 등록</span>
                </motion.a>
                <motion.a
                  href="/dashboard/appointments/new"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Calendar className="h-8 w-8 text-green-600 mb-2" />
                  <span className="font-medium text-green-900">예약 등록</span>
                </motion.a>
                <motion.a
                  href="/dashboard/medical-records/new"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <FileText className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="font-medium text-purple-900">진료 기록</span>
                </motion.a>
                <motion.a
                  href="/dashboard/billing"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center justify-center p-6 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <DollarSign className="h-8 w-8 text-orange-600 mb-2" />
                  <span className="font-medium text-orange-900">수납 관리</span>
                </motion.a>
              </div>
            </CardContent>
          </Card>
        </SlideUp>
      </StaggerContainer>
    </div>
  );
}
