import http from 'src/utils/http'
import type { SuccessResponse, Order, OrderStatus, PaginatedData } from 'src/types'

interface OrderListParams {
  page?: number
  limit?: number
  status?: OrderStatus
  sort_by?: string
  order?: string
  search?: string
  user_id?: string
}

interface OrderListResponse {
  orders: Order[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface OrderCountByStatus extends Record<OrderStatus, number> {
  total: number
}

const ordersApi = {
  getOrders: (params?: OrderListParams) =>
    http.get<SuccessResponse<{ orders: Order[]; pagination: PaginatedData<Order>['pagination'] }>>('admin/orders', { params }),

  getOrder: (orderId: string) => http.get<SuccessResponse<Order>>(`admin/orders/${orderId}`),

  getOrderCountByStatus: () =>
    http.get<SuccessResponse<OrderCountByStatus>>('admin/orders/count-by-status'),

  updateOrderStatus: (orderId: string, body: { status: OrderStatus }) =>
    http.put<SuccessResponse<Order>>(`admin/orders/${orderId}/status`, body),

  bulkUpdateStatus: (body: { order_ids: string[]; status: OrderStatus }) =>
    http.put<SuccessResponse<{ modifiedCount: number }>>('admin/orders/bulk-status', body),
}

export default ordersApi
