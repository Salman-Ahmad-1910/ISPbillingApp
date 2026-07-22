import type { InvoiceProductRecommendationInput, InvoiceProductRecommendationOutput } from '@/ai/flows/invoice-product-recommendation';

export async function getProductRecommendations(
  input: InvoiceProductRecommendationInput
): Promise<InvoiceProductRecommendationOutput> {
  const response = await fetch('/api/v1/ai/recommendations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Failed to get recommendations');
  return response.json();
}
