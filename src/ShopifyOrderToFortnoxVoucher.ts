import { Order, Config, Voucher, VoucherRow } from "./types";

export interface OrderGroup {
  date: string;
  country: string;
  orders: Order[];
}

export function groupOrdersByDateAndCountry(orders: Order[]): OrderGroup[] {
  const grouped: Record<string, Order[]> = {};
  for (const order of orders) {
    const key = `${order.created_at}:${order.currency}`;
    grouped[key] = grouped[key] || [];
    grouped[key].push(order);
  }
  return Object.entries(grouped).map(([key, items]) => {
    const [date] = key.split(":");
    return {
      date,
      country: "XX",
      orders: items,
    };
  });
}

export function getOrdersGroupToVoucher({
  groupedOrders,
  config,
}: {
  groupedOrders: OrderGroup;
  config: Config;
}): { voucher: Voucher; totalDebit: number; totalCredit: number } {
  const vatTotals: Record<number, { sales_net: number; sales_vat: number }> =
    {};
  groupedOrders.orders.forEach((order) => {
    order.line_items.forEach((item) => {
      item.tax_lines.forEach((tax) => {
        const vatRate = tax.rate;
        const itemTotalPrice = item.price * item.quantity;
        const vatAmount = tax.price;
        const netAmount = order.taxes_included
          ? itemTotalPrice - vatAmount
          : itemTotalPrice;
        if (!vatTotals[vatRate]) {
          vatTotals[vatRate] = { sales_net: 0, sales_vat: 0 };
        }
        vatTotals[vatRate].sales_net += netAmount;
        vatTotals[vatRate].sales_vat += vatAmount;
      });
    });
  });

// Calculate the total shipping cost across all orders
const totalShippingCost = groupedOrders.orders.reduce(
  (orderSum, order) => {
    const orderShippingCost = order.shipping_lines.reduce(
      (shippingSum, shippingLine) => shippingSum + shippingLine.price, 
      0
    );
    return orderSum + orderShippingCost;
  },
  0
);

// if there's actually shipping cost to distribute
if (totalShippingCost > 0) {
  // Find the total net sales to calculate proportions
  const totalNetSales = Object.values(vatTotals).reduce(
    (total, vatCategory) => total + vatCategory.sales_net,
    0
  );

  // Only distribute if we have sales to base the proportion on
  if (totalNetSales > 0) {
    // Go through each VAT rate and allocate shipping proportionally
    Object.keys(vatTotals).forEach((vatRateKey) => {
      const currentVatRate = parseFloat(vatRateKey);
      
      // Calculate what percentage of total sales this VAT rate represents
      const salesProportion = vatTotals[currentVatRate].sales_net / totalNetSales;
      
      // Allocate shipping cost based on this proportion
      const allocatedShipping = totalShippingCost * salesProportion;
      
      // Split the allocated shipping into net amount and VAT
      const vatOnShipping = allocatedShipping * currentVatRate;
      const netShippingAmount = allocatedShipping - vatOnShipping;
      
      // Add the shipping amounts to the existing totals for this VAT rate
      vatTotals[currentVatRate].sales_net += netShippingAmount;
      vatTotals[currentVatRate].sales_vat += vatOnShipping;
    });
  }
}

  const rows: VoucherRow[] = [
    {
      Account: config.accounts.order_receivables,
      Debit: groupedOrders.orders.reduce((s, o) => s + o.total_price, 0),
      TransactionInformation: "Receivables",
      Quantity: 1,
    },
  ];

  if (vatTotals[0.25]) {
    rows.push({
      Account: config.accounts.sales_revenue_25,
      Credit: vatTotals[0.25].sales_net,
      TransactionInformation: "Sales Revenue 25%",
      Quantity: 1,
    });
    rows.push({
      Account: config.accounts.output_vat_25,
      Credit: vatTotals[0.25].sales_vat,
      TransactionInformation: "Output VAT 25%",
      Quantity: 1,
    });
  }

  if (vatTotals[0.12]) {
    rows.push({
      Account: config.accounts.sales_revenue_12,
      Credit: vatTotals[0.12].sales_net,
      TransactionInformation: "Sales Revenue 12%",
      Quantity: 1,
    });
    rows.push({
      Account: config.accounts.output_vat_12,
      Credit: vatTotals[0.12].sales_vat,
      TransactionInformation: "Output VAT 12%",
      Quantity: 1,
    });
  }

  // Commented the separate shipping account handling 
  // shipping is  distributed now
  // across the VAT rate accounts above
  //   if (config.accounts.order_shipping) {
  //   const shipping = groupedOrders.orders.reduce(
  //     (sum, order) =>
  //       sum + order.shipping_lines.reduce((s, sl) => s + sl.price, 0),
  //     0
  //   );
  //   if (shipping > 0) {
  //     rows.push({
  //       Account: config.accounts.order_shipping,
  //       Credit: shipping,
  //       TransactionInformation: "Shipping",
  //       Quantity: 1,
  //     });
  //   }
  // }

  const voucher: Voucher = {
    VoucherRows: rows,
  };

  const totalDebit = rows.reduce((sum, row) => sum + (row.Debit || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + (row.Credit || 0), 0);

  return { voucher, totalDebit, totalCredit };
}
