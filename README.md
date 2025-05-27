# Shipping VAT Allocation Test

This mini-project contains a simplified version of the logic used in the main project to convert Shopify orders into Fortnox vouchers.

## Goal

Implement the shipping cost allocation so that shipping is distributed proportionally across the VAT rates used in the order items.

The function to update is in `src/ShopifyOrderToFortnoxVoucher.ts` under the `TODO` comment.

## Getting Started

1. Install dependencies
   ```bash
   npm install
   ```
2. Run the tests
   ```bash
   npm test
   ```

## Files

- `src/` contains the minimal implementation.
- `tests/` includes a test that should pass once the shipping allocation logic is implemented.