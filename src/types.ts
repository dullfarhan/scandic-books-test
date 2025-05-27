export interface TaxLine {
  price: number;
  rate: number;
}

export interface LineItem {
  price: number;
  quantity: number;
  tax_lines: TaxLine[];
}

export interface ShippingLine {
  price: number;
  discount_allocations?: { amount: number }[];
}

export interface Order {
  id: string;
  currency: string;
  created_at: string;
  taxes_included: boolean;
  line_items: LineItem[];
  shipping_lines: ShippingLine[];
  total_price: number;
}

export interface VoucherRow {
  Account: number;
  Debit?: number;
  Credit?: number;
  TransactionInformation: string;
  Quantity: number;
}

export interface Voucher {
  VoucherRows: VoucherRow[];
}

export interface Config {
  accounts: {
    order_receivables: number;
    order_shipping?: number;
    sales_revenue_25: number;
    output_vat_25: number;
    sales_revenue_12: number;
    output_vat_12: number;
  };
}
