/**
 * @fileOverview This file defines a Genkit flow for providing product recommendations based on customer profile.
 *
 * The flow takes customer profile information and returns a list of product recommendations.
 *
 * @module src/ai/flows/invoice-product-recommendation
 * @interface InvoiceProductRecommendationInput - The input type for the invoiceProductRecommendation function.
 * @interface InvoiceProductRecommendationOutput - The output type for the invoiceProductRecommendation function.
 * @function invoiceProductRecommendation - A function that handles the invoice product recommendation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InvoiceProductRecommendationInputSchema = z.object({
  customerProfile: z
    .string()
    .describe('Description of the customer profile, including industry, size and purchase history.'),
  invoiceHistory: z
    .string()
    .optional()
    .describe('Optional: a summary of past invoices for the customer.'),
});
export type InvoiceProductRecommendationInput = z.infer<
  typeof InvoiceProductRecommendationInputSchema
>;

const InvoiceProductRecommendationOutputSchema = z.object({
  recommendedProducts: z
    .array(z.string())
    .describe('A list of recommended products based on customer profile.'),
  reasoning: z
    .string()
    .optional()
    .describe('The reasoning behind the product recommendations.'),
});
export type InvoiceProductRecommendationOutput = z.infer<
  typeof InvoiceProductRecommendationOutputSchema
>;

export async function invoiceProductRecommendation(
  input: InvoiceProductRecommendationInput
): Promise<InvoiceProductRecommendationOutput> {
  return invoiceProductRecommendationFlow(input);
}

const invoiceProductRecommendationPrompt = ai.definePrompt({
  name: 'invoiceProductRecommendationPrompt',
  input: {schema: InvoiceProductRecommendationInputSchema},
  output: {schema: InvoiceProductRecommendationOutputSchema},
  prompt: `You are an AI assistant helping salespeople recommend products to customers.

  Based on the following customer profile:
  {{customerProfile}}

  And the customer's invoice history (if available):
  {{#if invoiceHistory}}
  {{invoiceHistory}}
  {{else}}
  No invoice history available.
  {{/if}}

  Recommend products that the customer is likely to purchase. Explain your reasoning.

  Format your response as a JSON object with "recommendedProducts" and "reasoning" fields.
  Make sure to include reasoning about the suggestions.  The "recommendedProducts" should be a list of product names, and the "reasoning" field should explain why these products are recommended.`,
});

const invoiceProductRecommendationFlow = ai.defineFlow(
  {
    name: 'invoiceProductRecommendationFlow',
    inputSchema: InvoiceProductRecommendationInputSchema,
    outputSchema: InvoiceProductRecommendationOutputSchema,
  },
  async input => {
    const {output} = await invoiceProductRecommendationPrompt(input);
    return output!;
  }
);
