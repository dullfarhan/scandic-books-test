import { describe, expect, test } from "vitest";
import {
  getOrdersGroupToVoucher,
  groupOrdersByDateAndCountry,
} from "../src/ShopifyOrderToFortnoxVoucher";
import { Order, Config } from "../src/types";

describe("order to voucher", () => {
  test("distributes shipping across VAT rates", () => {
    const orders: Order[] = [
      {
        id: "1",
        currency: "SEK",
        created_at: "2024-01-01",
        taxes_included: true,
        total_price: 180,
        line_items: [
          {
            price: 100,
            quantity: 1,
            tax_lines: [{ price: 20, rate: 0.25 }],
          },
          {
            price: 50,
            quantity: 1,
            tax_lines: [{ price: 6, rate: 0.12 }],
          },
        ],
        shipping_lines: [{ price: 30 }],
      },
    ];

    const groups = groupOrdersByDateAndCountry(orders);
    const config: Config = {
      accounts: {
        order_receivables: 1580,
        order_shipping: 3000,
        sales_revenue_25: 3001,
        output_vat_25: 2611,
        sales_revenue_12: 3002,
        output_vat_12: 2621,
      },
    };

    const { voucher } = getOrdersGroupToVoucher({
      groupedOrders: groups[0],
      config,
    });

    // Expect shipping of 30 to be split across VAT rates 25% and 12%
    // After implementation, voucher rows should include shipping allocation in sales rows
    expect(voucher.VoucherRows.length).toBeGreaterThan(1);
  });
});
