import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refreshToken,
          });

          const { accessToken, refreshToken: newRefreshToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: string;
  }) => api.post('/auth/register', data),

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  getProfile: () => api.get('/auth/profile'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Users API
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: { name?: string; phone?: string }) =>
    api.put(`/users/${id}`, data),
  changePassword: (id: string, data: { currentPassword: string; newPassword: string }) =>
    api.post(`/users/${id}/change-password`, data),
  adminUpdate: (id: string, data: { role?: string; isActive?: boolean }) =>
    api.put(`/users/${id}/admin`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Hospitals API
export const hospitalsApi = {
  getAll: (params?: { page?: number; limit?: number; networkOnly?: boolean }) =>
    api.get('/hospitals', { params }),
  getById: (id: string) => api.get(`/hospitals/${id}`),
  getMy: () => api.get('/hospitals/my'),
  create: (data: {
    name: string;
    businessNumber: string;
    licenseNumber?: string;
    address: string;
    addressDetail?: string;
    zipCode?: string;
    phone: string;
    email?: string;
    website?: string;
    description?: string;
  }) => api.post('/hospitals', data),
  update: (id: string, data: {
    name?: string;
    address?: string;
    addressDetail?: string;
    zipCode?: string;
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    operatingHours?: Record<string, { open: string | null; close: string | null }>;
  }) => api.put(`/hospitals/${id}`, data),
  delete: (id: string) => api.delete(`/hospitals/${id}`),
  // Staff management
  addStaff: (hospitalId: string, data: { userId: string; position?: string; licenseNo?: string }) =>
    api.post(`/hospitals/${hospitalId}/staff`, data),
  updateStaff: (hospitalId: string, staffId: string, data: { position?: string; licenseNo?: string; isActive?: boolean }) =>
    api.put(`/hospitals/${hospitalId}/staff/${staffId}`, data),
  removeStaff: (hospitalId: string, staffId: string) =>
    api.delete(`/hospitals/${hospitalId}/staff/${staffId}`),
};

// Animals API
export const animalsApi = {
  getAll: () => api.get('/animals/my'),
  getMy: () => api.get('/animals/my'),
  search: (code: string, hospitalId: string) =>
    api.get('/animals/search', { params: { code, hospitalId } }),
  getByCode: (code: string) => api.get(`/animals/code/${code}`),
  getById: (id: string) => api.get(`/animals/${id}`),
  create: (data: {
    name: string;
    species: string;
    breed?: string;
    birthDate?: string;
    birthDateType?: string;
    gender: string;
    weight?: number;
    color?: string;
    microchipId?: string;
    notes?: string;
    guardianId?: string;
  }) => api.post('/animals', data),
  update: (id: string, data: {
    name?: string;
    breed?: string;
    birthDate?: string;
    gender?: string;
    weight?: number;
    color?: string;
    microchipId?: string;
    isNeutered?: boolean;
    isDeceased?: boolean;
    notes?: string;
  }) => api.put(`/animals/${id}`, data),
  delete: (id: string) => api.delete(`/animals/${id}`),
  // Guardian management
  addGuardian: (animalId: string, data: { guardianId: string; isPrimary?: boolean; relation?: string }) =>
    api.post(`/animals/${animalId}/guardians`, data),
  removeGuardian: (animalId: string, guardianId: string) =>
    api.delete(`/animals/${animalId}/guardians/${guardianId}`),
};

// Appointments API
export const appointmentsApi = {
  getAll: (params?: {
    hospitalId?: string;
    animalId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/appointments', { params }),
  getById: (id: string) => api.get(`/appointments/${id}`),
  getMyAppointments: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/appointments/my', { params }),
  getAvailableSlots: (params: { hospitalId: string; date: string }) =>
    api.get('/appointments/available-slots', { params }),
  getStats: (hospitalId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/appointments/stats/${hospitalId}`, { params }),
  create: (data: {
    hospitalId: string;
    animalId: string;
    vetId?: string;
    appointmentDate: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    type?: string;
    reason?: string;
    symptoms?: string;
    notes?: string;
  }) => api.post('/appointments', data),
  update: (id: string, data: {
    hospitalId?: string;
    vetId?: string;
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    type?: string;
    reason?: string;
    symptoms?: string;
    notes?: string;
    cancelReason?: string;
  }) => api.put(`/appointments/${id}`, data),
  updateStatus: (id: string, data: { status: string; cancelReason?: string }) =>
    api.patch(`/appointments/${id}/status`, data),
  delete: (id: string) => api.delete(`/appointments/${id}`),
  // Time slots
  getTimeSlots: (hospitalId: string) =>
    api.get(`/appointments/time-slots/${hospitalId}`),
  createTimeSlot: (data: {
    hospitalId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxAppointments?: number;
    slotDuration?: number;
  }) => api.post('/appointments/time-slots', data),
  deleteTimeSlot: (id: string) => api.delete(`/appointments/time-slots/${id}`),
  // Holidays
  getHolidays: (hospitalId: string, params?: { year?: number }) =>
    api.get(`/appointments/holidays/${hospitalId}`, { params }),
  createHoliday: (data: {
    hospitalId: string;
    date: string;
    name: string;
    reason?: string;
  }) => api.post('/appointments/holidays', data),
  deleteHoliday: (id: string) => api.delete(`/appointments/holidays/${id}`),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: {
    hospitalId?: string;
    guardianId?: string;
    animalId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  getStats: (params: { hospitalId: string; startDate?: string; endDate?: string }) =>
    api.get('/invoices/stats', { params }),
  create: (data: {
    hospitalId: string;
    animalId: string;
    guardianId: string;
    medicalRecordId?: string;
    appointmentId?: string;
    dueDate?: string;
    notes?: string;
    internalNotes?: string;
    items: Array<{
      type: string;
      name: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      discountRate?: number;
      discountAmount?: number;
      sortOrder?: number;
    }>;
  }) => api.post('/invoices', data),
  update: (id: string, data: {
    dueDate?: string;
    status?: string;
    notes?: string;
    internalNotes?: string;
  }) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  // Invoice items
  addItem: (invoiceId: string, data: {
    type: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discountRate?: number;
    discountAmount?: number;
    sortOrder?: number;
  }) => api.post(`/invoices/${invoiceId}/items`, data),
  updateItem: (itemId: string, data: {
    type?: string;
    name?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    discountRate?: number;
    discountAmount?: number;
    sortOrder?: number;
  }) => api.put(`/invoices/items/${itemId}`, data),
  deleteItem: (itemId: string) => api.delete(`/invoices/items/${itemId}`),
  // Payments
  createPayment: (data: {
    invoiceId: string;
    amount: number;
    method: string;
    cardNumber?: string;
    cardCompany?: string;
    cardApprovalNo?: string;
    cardInstallment?: number;
    notes?: string;
  }) => api.post('/invoices/payments', data),
  getPayments: (params?: {
    hospitalId?: string;
    invoiceId?: string;
    status?: string;
    method?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/invoices/payments/list', { params }),
  refundPayment: (paymentId: string, data: { amount: number; reason: string }) =>
    api.patch(`/invoices/payments/${paymentId}/refund`, data),
};

// Inventory API
export const inventoryApi = {
  // Categories
  getCategories: (hospitalId: string) =>
    api.get('/inventory/categories', { params: { hospitalId } }),
  createCategory: (data: { hospitalId: string; name: string; description?: string; parentId?: string; sortOrder?: number }) =>
    api.post('/inventory/categories', data),
  updateCategory: (id: string, data: { name?: string; description?: string; parentId?: string; sortOrder?: number; isActive?: boolean }) =>
    api.put(`/inventory/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/inventory/categories/${id}`),

  // Suppliers
  getSuppliers: (hospitalId: string, params?: { status?: string; search?: string }) =>
    api.get('/inventory/suppliers', { params: { hospitalId, ...params } }),
  getSupplierById: (id: string) => api.get(`/inventory/suppliers/${id}`),
  createSupplier: (data: {
    hospitalId: string;
    name: string;
    businessNumber?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    bankName?: string;
    bankAccount?: string;
    paymentTerms?: string;
    notes?: string;
  }) => api.post('/inventory/suppliers', data),
  updateSupplier: (id: string, data: {
    name?: string;
    businessNumber?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    address?: string;
    bankName?: string;
    bankAccount?: string;
    paymentTerms?: string;
    notes?: string;
    status?: string;
  }) => api.put(`/inventory/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/inventory/suppliers/${id}`),

  // Products
  getProducts: (hospitalId: string, params?: {
    categoryId?: string;
    supplierId?: string;
    type?: string;
    search?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) => api.get('/inventory/products', { params: { hospitalId, ...params } }),
  getProductById: (id: string) => api.get(`/inventory/products/${id}`),
  createProduct: (data: {
    hospitalId: string;
    categoryId?: string;
    supplierId?: string;
    name: string;
    genericName?: string;
    type?: string;
    unit?: string;
    description?: string;
    barcode?: string;
    costPrice?: number;
    sellingPrice?: number;
    taxRate?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    manufacturer?: string;
    expirationMonths?: number;
    storageCondition?: string;
    requiresPrescription?: boolean;
    imageUrl?: string;
  }) => api.post('/inventory/products', data),
  updateProduct: (id: string, data: {
    categoryId?: string;
    supplierId?: string;
    name?: string;
    genericName?: string;
    type?: string;
    unit?: string;
    description?: string;
    barcode?: string;
    costPrice?: number;
    sellingPrice?: number;
    taxRate?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    manufacturer?: string;
    expirationMonths?: number;
    storageCondition?: string;
    requiresPrescription?: boolean;
    imageUrl?: string;
    isActive?: boolean;
  }) => api.put(`/inventory/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/inventory/products/${id}`),

  // Stocks
  getStocks: (hospitalId: string, params?: { productId?: string; lowStock?: boolean; expiringSoon?: boolean }) =>
    api.get('/inventory/stocks', { params: { hospitalId, ...params } }),
  adjustStock: (data: { hospitalId: string; productId: string; newQuantity: number; reason?: string; lotNumber?: string }) =>
    api.post('/inventory/stocks/adjust', data),

  // Transactions
  getTransactions: (hospitalId: string, params?: {
    productId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/inventory/transactions', { params: { hospitalId, ...params } }),
  createTransaction: (data: {
    hospitalId: string;
    productId: string;
    type: string;
    quantity: number;
    unitCost?: number;
    referenceType?: string;
    referenceId?: string;
    lotNumber?: string;
    expirationDate?: string;
    notes?: string;
  }) => api.post('/inventory/transactions', data),

  // Purchase Orders
  getPurchaseOrders: (hospitalId: string, params?: {
    supplierId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/inventory/purchase-orders', { params: { hospitalId, ...params } }),
  getPurchaseOrderById: (id: string) => api.get(`/inventory/purchase-orders/${id}`),
  createPurchaseOrder: (data: {
    hospitalId: string;
    supplierId: string;
    orderDate?: string;
    expectedDate?: string;
    notes?: string;
    internalNotes?: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      notes?: string;
    }>;
  }) => api.post('/inventory/purchase-orders', data),
  updatePurchaseOrder: (id: string, data: {
    supplierId?: string;
    orderDate?: string;
    expectedDate?: string;
    notes?: string;
    internalNotes?: string;
  }) => api.put(`/inventory/purchase-orders/${id}`, data),
  approvePurchaseOrder: (id: string) => api.patch(`/inventory/purchase-orders/${id}/approve`),
  receivePurchaseOrder: (id: string, data: {
    items: Array<{
      itemId: string;
      receivedQuantity: number;
      lotNumber?: string;
      expirationDate?: string;
    }>;
    notes?: string;
  }) => api.patch(`/inventory/purchase-orders/${id}/receive`, data),
  cancelPurchaseOrder: (id: string) => api.patch(`/inventory/purchase-orders/${id}/cancel`),

  // Stats
  getStats: (hospitalId: string) => api.get('/inventory/stats', { params: { hospitalId } }),
};

// Notifications API
export const notificationsApi = {
  // 알림 관리
  getNotifications: (hospitalId: string, params?: {
    type?: string;
    channel?: string;
    status?: string;
    recipientId?: string;
    page?: number;
    limit?: number;
  }) => api.get(`/notifications/hospital/${hospitalId}`, { params }),
  getNotificationById: (id: string) => api.get(`/notifications/${id}`),
  getUserNotifications: (userId: string, unreadOnly?: boolean) =>
    api.get(`/notifications/user/${userId}`, { params: { unreadOnly } }),
  getMyNotifications: (unreadOnly?: boolean) =>
    api.get('/notifications/my/list', { params: { unreadOnly } }),
  createNotification: (data: {
    hospitalId: string;
    recipientId: string;
    type: string;
    channel: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    scheduledAt?: string;
  }) => api.post('/notifications', data),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: (userId: string) => api.put(`/notifications/user/${userId}/read-all`),
  markMyAllAsRead: () => api.put('/notifications/my/read-all'),
  cancelNotification: (id: string) => api.delete(`/notifications/${id}`),

  // 알림 발송
  sendNotification: (data: {
    hospitalId: string;
    recipientId: string;
    type: string;
    channel?: string;
    data?: Record<string, unknown>;
  }) => api.post('/notifications/send', data),
  resendNotification: (id: string) => api.post(`/notifications/${id}/resend`),

  // 템플릿 관리
  getTemplates: (hospitalId?: string) =>
    hospitalId
      ? api.get(`/notifications/templates/hospital/${hospitalId}`)
      : api.get('/notifications/templates/default'),
  createTemplate: (data: {
    hospitalId?: string;
    name: string;
    type: string;
    channel: string;
    subject?: string;
    content: string;
    kakaoTemplateCode?: string;
  }) => api.post('/notifications/templates', data),
  updateTemplate: (id: string, data: {
    name?: string;
    subject?: string;
    content?: string;
    kakaoTemplateCode?: string;
    isActive?: boolean;
  }) => api.put(`/notifications/templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/notifications/templates/${id}`),

  // 설정 관리
  getSettings: (hospitalId: string) => api.get(`/notifications/settings/${hospitalId}`),
  updateSettings: (hospitalId: string, data: {
    smsEnabled?: boolean;
    smsProvider?: string;
    smsApiKey?: string;
    smsApiSecret?: string;
    smsSenderId?: string;
    kakaoEnabled?: boolean;
    kakaoPlusFriendId?: string;
    kakaoApiKey?: string;
    kakaoSenderKey?: string;
    emailEnabled?: boolean;
    emailProvider?: string;
    emailHost?: string;
    emailPort?: number;
    emailUser?: string;
    emailPassword?: string;
    emailFromName?: string;
    emailFromAddress?: string;
    pushEnabled?: boolean;
    fcmServerKey?: string;
    appointmentReminderHours?: number;
  }) => api.put(`/notifications/settings/${hospitalId}`, data),

  // 통계
  getStats: (hospitalId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/notifications/stats/${hospitalId}`, { params }),

  // 예약 리마인더
  sendAppointmentReminders: () => api.post('/notifications/reminders/send'),
};

// Dashboard API
export const dashboardApi = {
  getStats: (hospitalId: string) =>
    api.get('/dashboard/stats', { params: { hospitalId } }),
  getWeeklyAppointmentTrend: (hospitalId: string) =>
    api.get('/dashboard/appointments/trend', { params: { hospitalId } }),
  getMonthlyRevenueTrend: (hospitalId: string, months?: number) =>
    api.get('/dashboard/revenue/trend', { params: { hospitalId, months } }),
  getSpeciesDistribution: (hospitalId: string) =>
    api.get('/dashboard/species/distribution', { params: { hospitalId } }),
};

// Medical Records API
export const medicalRecordsApi = {
  getByAnimal: (animalId: string) =>
    api.get(`/medical-records/animal/${animalId}`),
  getByHospital: (hospitalId: string) =>
    api.get(`/medical-records/hospital/${hospitalId}`),
  getShared: () => api.get('/medical-records/shared'),
  getById: (id: string) => api.get(`/medical-records/${id}`),
  create: (data: {
    animalId: string;
    hospitalId: string;
    visitDate?: string;
    chiefComplaint: string;
    subjective?: string;
    vitalSigns?: {
      temperature?: number;
      heartRate?: number;
      respiratoryRate?: number;
      weight?: number;
      bodyConditionScore?: number;
    };
    physicalExamination?: string;
    diagnosis?: string;
    diagnosisCodes?: string[];
    treatmentPlan?: string;
    proceduresPerformed?: string;
    prescriptions?: Array<{
      medicationName: string;
      dosage: string;
      frequency: string;
      duration: number;
      instructions?: string;
    }>;
    labResults?: Array<{
      testName: string;
      testItem: string;
      resultValue: string;
      referenceRange?: string;
      unit?: string;
      isAbnormal?: boolean;
    }>;
    followUpDate?: string;
    internalNotes?: string;
    attachments?: string[];
  }) => api.post('/medical-records', data),
  update: (id: string, data: {
    subjective?: string;
    vitalSigns?: {
      temperature?: number;
      heartRate?: number;
      respiratoryRate?: number;
      weight?: number;
      bodyConditionScore?: number;
    };
    physicalExamination?: string;
    diagnosis?: string;
    diagnosisCodes?: string[];
    treatmentPlan?: string;
    proceduresPerformed?: string;
    followUpDate?: string;
    internalNotes?: string;
    attachments?: string[];
  }) => api.put(`/medical-records/${id}`, data),
  delete: (id: string) => api.delete(`/medical-records/${id}`),
};

export default api;
