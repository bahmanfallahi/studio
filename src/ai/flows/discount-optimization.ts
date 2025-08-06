'use server';

/**
 * @fileOverview AI discount optimization flow.
 *
 * - optimizeDiscount - A function that suggests the optimal discount percentage for a product based on sales agent performance and market conditions.
 * - OptimizeDiscountInput - The input type for the optimizeDiscount function.
 * - OptimizeDiscountOutput - The return type for the optimizeDiscount function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeDiscountInputSchema = z.object({
  productId: z.number().describe('The ID of the product for which to optimize the discount.'),
  salesAgentId: z.number().describe('The ID of the sales agent.'),
  salesAgentPerformance: z
    .number()
    .describe('The recent sales performance of the sales agent (e.g., number of sales in the last month).'),
  marketConditions: z
    .string()
    .describe(
      'A description of the current market conditions, including competitor pricing and demand.'
    ),
});
export type OptimizeDiscountInput = z.infer<typeof OptimizeDiscountInputSchema>;

const OptimizeDiscountOutputSchema = z.object({
  discountPercentage: z
    .number()
    .describe(
      'The suggested optimal discount percentage to maximize sales conversion, between 0 and 100.'
    ),
  reasoning: z.string().describe('The AI reasoning behind the suggested discount percentage.'),
});
export type OptimizeDiscountOutput = z.infer<typeof OptimizeDiscountOutputSchema>;

export async function optimizeDiscount(input: OptimizeDiscountInput): Promise<OptimizeDiscountOutput> {
  return optimizeDiscountFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeDiscountPrompt',
  input: {schema: OptimizeDiscountInputSchema},
  output: {schema: OptimizeDiscountOutputSchema},
  prompt: `You are an AI assistant helping sales managers determine the optimal discount percentage for products to increase sales conversion.

  Consider the following factors:
  - Product ID: {{{productId}}}
  - Sales agent ID: {{{salesAgentId}}}
  - Sales agent recent performance: {{{salesAgentPerformance}}}
  - Current market conditions: {{{marketConditions}}}

  Based on these factors, suggest a discount percentage (between 0 and 100) that would be most effective in driving sales conversion, and explain your reasoning.

  Ensure the discount percentage and reasoning are clearly explained in the output.

  Output format: {
    "discountPercentage": number,
    "reasoning": string
  }`,
});

const optimizeDiscountFlow = ai.defineFlow(
  {
    name: 'optimizeDiscountFlow',
    inputSchema: OptimizeDiscountInputSchema,
    outputSchema: OptimizeDiscountOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
