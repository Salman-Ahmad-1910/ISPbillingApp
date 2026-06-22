'use server';

import {
  invoiceProductRecommendation,
  type InvoiceProductRecommendationInput,
} from '@/ai/flows/invoice-product-recommendation';

export async function getProductRecommendations(
  input: InvoiceProductRecommendationInput
) {
  return await invoiceProductRecommendation(input);
}
