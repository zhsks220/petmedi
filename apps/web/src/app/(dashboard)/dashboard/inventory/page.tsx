'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button, Input, Card, CardContent, Badge, NativeSelect } from '@/components/ui';
import { inventoryApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AxiosError } from 'axios';

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
  MEDICATION: 'bg-blue-100 text-blue-800',
  SUPPLY: 'bg-gray-100 text-gray-800',
  EQUIPMENT: 'bg-purple-100 text-purple-800',
  VACCINE: 'bg-green-100 text-green-800',
  FOOD: 'bg-yellow-100 text-yellow-800',
  OTHER: 'bg-gray-100 text-gray-600',
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getTotalStock = (product: Product): number => {
  return product.stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0;
};

const getStockStatus = (product: Product) => {
  const totalStock = getTotalStock(product);
  if (totalStock === 0) return { label: '재고없음', color: 'bg-red-100 text-red-800' };
  if (totalStock <= product.reorderPoint) return { label: '부족', color: 'bg-yellow-100 text-yellow-800' };
  return { label: '정상', color: 'bg-green-100 text-green-800' };
};

export default function InventoryPage() {
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

  const filteredProducts = products.filter((product) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(term) ||
      (product.barcode && product.barcode.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="재고 관리" />

      <div className="flex-1 p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">전체 제품</p>
                  <p className="text-2xl font-bold">{stats?.totalProducts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">재고 부족</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats?.lowStockProducts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">재고 없음</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.outOfStockProducts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">유통기한 임박</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.expiringProducts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Truck className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">대기 발주</p>
                  <p className="text-2xl font-bold">{stats?.pendingOrders || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">재고 가치</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(stats?.totalStockValue || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="search"
                placeholder="제품명, 바코드로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <NativeSelect
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-32"
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
              className="w-32"
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
              className="w-32"
            >
              <option value="">재고 상태</option>
              <option value="low">부족 재고</option>
            </NativeSelect>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/inventory/purchase-orders">
              <Button variant="outline">
                <Truck className="h-4 w-4 mr-2" />
                발주 관리
              </Button>
            </Link>
            <Link href="/dashboard/inventory/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                제품 등록
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">오류 발생</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchProducts}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  다시 시도
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Products List */}
        {!error && isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 bg-gray-100 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !error && filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              제품이 없습니다
            </h3>
            <p className="text-muted-foreground mb-4">
              아직 등록된 제품이 없습니다.
            </p>
            <Link href="/dashboard/inventory/products/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                제품 등록하기
              </Button>
            </Link>
          </div>
        ) : !error ? (
          <div className="space-y-4">
            {/* Table Header */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-4">제품 정보</div>
                  <div className="col-span-2">유형/카테고리</div>
                  <div className="col-span-2 text-right">재고 수량</div>
                  <div className="col-span-2 text-right">판매가</div>
                  <div className="col-span-2 text-right">작업</div>
                </div>
              </CardContent>
            </Card>

            {filteredProducts.map((product) => {
              const stockStatus = getStockStatus(product);
              const totalStock = getTotalStock(product);

              return (
                <Card key={product.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Product Info */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{product.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.barcode && `바코드: ${product.barcode}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Type & Category */}
                      <div className="col-span-2">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium ${productTypeColors[product.type]}`}
                          >
                            {productTypeLabels[product.type] || product.type}
                          </span>
                          {product.category && (
                            <span className="text-xs text-muted-foreground">
                              {product.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stock Quantity */}
                      <div className="col-span-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-lg font-semibold">
                            {totalStock} {product.unit}
                          </span>
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}
                          >
                            {stockStatus.label}
                          </span>
                        </div>
                      </div>

                      {/* Selling Price */}
                      <div className="col-span-2 text-right">
                        <span className="font-medium">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                        {product.costPrice && (
                          <p className="text-xs text-muted-foreground">
                            원가: {formatCurrency(product.costPrice)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/inventory/products/${product.id}/adjust`}>
                            <Button variant="outline" size="sm">
                              수량 조정
                            </Button>
                          </Link>
                          <Link href={`/dashboard/inventory/products/${product.id}`}>
                            <Button variant="outline" size="sm">
                              상세
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}

        {/* Pagination */}
        {!isLoading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
