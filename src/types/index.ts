export type OrderStatus =
  | "waiting_for_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export interface Product {
  id: string;
  created_at: string;
  name: string | null;
  price: number | null;
  description: string | null;
  image_url: string[] | null;
  model_3d_url: string | null;
  sizes: (string | number)[] | null;
  is_new: boolean | null;
  stock_status: "in_stock" | "out_of_stock" | "pre_order" | null;
  slug: string | null;
  quantity: number | null;
  materials: string | null;
  weight: string | null;
  box?: string | null;
  condition?: string | null;
}

export interface OrderItem {
  name: string;
  selectedSize: number | string;
  price: number;
  cart_quantity: number;
}

export interface Order {
  id: string;
  created_at: string;
  order_number: string;
  total_price: number;
  status: OrderStatus;
  customer_name: string;
  contact: string;
  shipping_zone: string;
  items: OrderItem[];
  current_status_index: number;
  is_international: boolean;
  tracking_number: string | null;
  customer_chat_id: number | null;
}

export interface BotUser {
  tg_username: string;
  chat_id: number;
  created_at: string | null;
}
