'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Package,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Truck,
  Filter,
  MoreHorizontal,
  PackageSearch
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button, Input, Card, CardContent, Badge, NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';
import { StaggerContainer, SlideUp, FadeIn } from '@/components/ui/motion-wrapper';

interface Product {
  id: string;
  name: string;
  barcode?: string;
  type: string;
  unit: string;
  sellingPrice: number;
  costPrice?: number;
  reorderPoint: number;
  reorderQuantity: number;
  isActive: boolean;
  category?: {
    id: string;
    name: string;
  };
  supplier?: {
    id: string;
    name: string;
  };
  stocks?: Array<{
    id: string;
    quantity: number;
    lotNumber?: string;
    expirationDate?: string;
  }>;
  _count?: {
    stocks: number;
    transactions: number;
  };
}

interface InventoryStats {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  expiringProducts: number;
  totalStockValue: number;
  pendingOrders: number;
}

interface Category {
  id: string;
  name: string;
}

const productTypeLabels: Record<string, string> = {
  MEDICATION: '약품',
  SUPPLY: '소모품',
  EQUIPMENT: '장비',
  VACCINE: '백신',
  FOOD: '사료',
  OTHER: '기타',
};

const productTypeColors: Record<string, string> = {
  MEDICATION: 'bg-blue-50 text-blue-700 border-blue-200',
  SUPPLY: 'bg-slate-50 text-slate-700 border-slate-200',
  EQUIPMENT: 'bg-purple-50 text-purple-700 border-purple-200',
  VACCINE: 'bg-green-50 text-green-700 border-green-200',
  FOOD: 'bg-amber-50 text-amber-700 border-amber-200',
  OTHER: 'bg-gray-50 text-gray-700 border-gray-200',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

const getTotalStock = (product: Product): number => {
  return product.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0;
};

const getStockStatus = (product: Product) => {
  const totalStock = getTotalStock(product);
  if (totalStock === 0) return { label: '재고없음', color: 'bg-red-50 text-red-700 border-red-200' };
  if (totalStock <= product.reorderPoint) return { label: '부족', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { label: '정상', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
};

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    if (!hospitalId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await inventoryApi.getProducts(hospitalId, {
        ...(typeFilter && { type: typeFilter }),
        ...(categoryFilter && { categoryId: categoryFilter }),
        ...(stockFilter === 'low' && { lowStock: true }),
        ...(searchTerm && { search: searchTerm }),
        page: currentPage,
        limit: 20,
      });
      const data = response.data;
      setProducts(data.data || []);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || '제품 목록을 불러오는데 실패했습니다.';
      setError(message);
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hospitalId, typeFilter, categoryFilter, stockFilter, searchTerm, currentPage]);

  const fetchCategories = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getCategories(hospitalId);
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [hospitalId]);

  const fetchStats = useCallback(async () => {
    if (!hospitalId) return;
    try {
      const response = await inventoryApi.getStats(hospitalId);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  const filteredProducts = products; // Already filtered by API

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader
        title="재고 관리"
        description="의약품, 소모품 등 병원 내 재고 현황을 관리합니다"
        icon={Package}
      >
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory/purchase-orders">
            <Button variant="outline" size="sm" className="gap-2">
              <Truck className="h-4 w-4" />
              발주 관리
            </Button>
          </Link>
          <Link href="/dashboard/inventory/products/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              제품 등록
            </Button>
          </Link>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6 md:p-8">
        <StaggerContainer className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <SlideUp className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <PackageSearch className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">전체 제품</p>
                    <p className="text-xl font-bold text-slate-900">{stats?.totalProducts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <TrendingDown className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">재고 부족</p>
                    <p className="text-xl font-bold text-amber-600">{stats?.lowStockProducts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">재고 없음</p>
                    <p className="text-xl font-bold text-red-600">{stats?.outOfStockProducts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">유통기한 임박</p>
                    <p className="text-xl font-bold text-orange-600">{stats?.expiringProducts || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Truck className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">대기 발주</p>
                    <p className="text-xl font-bold text-slate-900">{stats?.pendingOrders || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">재고 가치</p>
                    <p className="text-lg font-bold text-emerald-600 truncate" title={formatCurrency(stats?.totalStockValue || 0)}>
                      {formatCurrency(stats?.totalStockValue || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Actions Bar */}
          <FadeIn className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex flex-1 gap-2 flex-wrap w-full sm:w-auto">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="search"
                  placeholder="제품명, 바코드로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                />
              </div>
              <NativeSelect
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-32 h-9"
              >
                <option value="">전체 유형</option>
                <option value="MEDICATION">약품</option>
                <option value="SUPPLY">소모품</option>
                <option value="EQUIPMENT">장비</option>
                <option value="VACCINE">백신</option>
                <option value="FOOD">사료</option>
                <option value="OTHER">기타</option>
              </NativeSelect>
              <NativeSelect
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-32 h-9"
              >
                <option value="">전체 카테고리</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </NativeSelect>
              <NativeSelect
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="w-32 h-9"
              >
                <option value="">재고 상태</option>
                <option value="low">부족 재고</option>
              </NativeSelect>
            </div>

            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={fetchProducts}>
              <RefreshCw className={`h-4 w-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </FadeIn>

          {/* Error State */}
          {error && (
            <FadeIn>
              <div className="p-4 rounded-lg border border-red-100 bg-red-50 text-red-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchProducts} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                  다시 시도
                </Button>
              </div>
            </FadeIn>
          )}

          {/* Products Table */}
          <SlideUp className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[300px]">제품 정보</TableHead>
                  <TableHead>유형/카테고리</TableHead>
                  <TableHead className="text-right">재고 수량</TableHead>
                  <TableHead className="text-right">판매가 (원가)</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-10 w-48 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                      <TableCell><div className="h-10 w-24 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                      <TableCell><div className="h-10 w-32 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                      <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Package className="h-8 w-8 mb-2 text-slate-300" />
                        <p>제품이 없습니다</p>
                        <p className="text-xs text-slate-400 mt-1">검색 조건에 맞는 제품을 찾을 수 없습니다</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const totalStock = getTotalStock(product);

                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => router.push(`/dashboard/inventory/products/${product.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                              <Package className="h-5 w-5 text-slate-500" />
                            </div>
                            <div>
                              <div className="font-medium text-slate-900">{product.name}</div>
                              {product.barcode && (
                                <div className="text-xs text-slate-500 font-mono tracking-wider">{product.barcode}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge className={`font-normal border ${productTypeColors[product.type] || 'bg-slate-100 text-slate-700'}`}>
                              {productTypeLabels[product.type] || product.type}
                            </Badge>
                            {product.category && (
                              <span className="text-xs text-slate-500 pl-1">
                                {product.category.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="font-semibold text-slate-900">{totalStock} <span className="text-xs font-normal text-slate-500">{product.unit}</span></span>
                            <Badge variant="outline" className={`font-medium text-[10px] px-1.5 py-0 h-5 ${stockStatus.color}`}>
                              {stockStatus.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-slate-900">{formatCurrency(product.sellingPrice)}</span>
                            {product.costPrice && (
                              <span className="text-xs text-slate-400">({formatCurrency(product.costPrice)})</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/products/${product.id}`)}>
                                상세 정보
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/products/${product.id}/adjust`)}>
                                재고 조정
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/dashboard/inventory/products/${product.id}/edit`)}>
                                정보 수정
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </SlideUp>

          {/* Pagination */}
          {!isLoading && !error && totalPages > 1 && (
            <FadeIn className="flex items-center justify-center gap-2 mt-6 pb-6">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-600 font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </FadeIn>
          )}

        </StaggerContainer>
      </div>
    </div>
  );
}
