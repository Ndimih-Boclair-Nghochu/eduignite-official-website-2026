import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Order,
  PaginatedResponse,
  ListParams,
  CreateOrderRequest,
  PlatformStats,
} from '../types';

export const ordersService = {
  async getOrders(params?: ListParams): Promise<PaginatedResponse<Order>> {
    const { data } = await apiClient.get(API.ORDERS.BASE, { params });
    return data;
  },

  async getOrder(id: string): Promise<Order> {
    const { data } = await apiClient.get(API.ORDERS.DETAIL(id));
    return data;
  },

  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    const { data } = await apiClient.post(API.ORDERS.BASE, orderData);
    return data;
  },

  async processOrder(id: string): Promise<Order> {
    const { data } = await apiClient.post(API.ORDERS.PROCESS(id), {});
    return data;
  },

  async updateOrder(id: string, orderData: Partial<CreateOrderRequest>): Promise<Order> {
    const { data } = await apiClient.patch(API.ORDERS.DETAIL(id), orderData);
    return data;
  },

  async getOrderStats(): Promise<PlatformStats> {
    const { data } = await apiClient.get(API.ORDERS.STATS);
    return data;
  },
};
