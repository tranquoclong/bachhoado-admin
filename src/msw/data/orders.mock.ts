import { createMockOrder } from 'src/test-utils/factories'
import type { Order } from 'src/types'

export const mockOrders: Order[] = [
  createMockOrder({ _id: 'order-1', status: 'pending', total: 29990000 }),
  createMockOrder({ _id: 'order-2', status: 'confirmed', total: 22990000 }),
  createMockOrder({ _id: 'order-3', status: 'processing', total: 49990000 }),
  createMockOrder({ _id: 'order-4', status: 'shipping', total: 16990000 }),
  createMockOrder({ _id: 'order-5', status: 'delivered', total: 5990000 }),
  createMockOrder({ _id: 'order-6', status: 'cancelled', total: 19990000 }),
  createMockOrder({ _id: 'order-7', status: 'returned', total: 9990000 }),
]
