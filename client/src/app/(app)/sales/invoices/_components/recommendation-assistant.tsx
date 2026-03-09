'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
  DrawerClose
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WandSparkles, Loader2, Lightbulb } from 'lucide-react';
import { getProductRecommendations } from '@/app/actions/get-recommendations';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { InvoiceProductRecommendationOutput } from '@/ai/flows/invoice-product-recommendation';


export function RecommendationAssistant() {
  const [customerProfile, setCustomerProfile] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvoiceProductRecommendationOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const recommendation = await getProductRecommendations({ customerProfile });
      setResult(recommendation);
    } catch (e) {
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="secondary" size="sm">
          <WandSparkles className="mr-2 h-4 w-4" />
          Get AI Recommendations
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle>Product Recommendation Assistant</DrawerTitle>
            <DrawerDescription>
              Describe the customer to get AI-powered product recommendations.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0 space-y-4">
             <div className="space-y-2">
                <Label htmlFor="customer-profile">Customer Profile</Label>
                <Textarea
                  id="customer-profile"
                  placeholder="e.g., Small construction company in Lahore, previous purchases include basic accounting software. Looking to expand their digital tools."
                  value={customerProfile}
                  onChange={(e) => setCustomerProfile(e.target.value)}
                  rows={4}
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-4">Analyzing profile and generating recommendations...</p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {result && (
                <Alert>
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle>Recommendations</AlertTitle>
                  <AlertDescription>
                    <p className="mb-4">{result.reasoning}</p>
                    <div className="flex flex-wrap gap-2">
                      {result.recommendedProducts.map((product, index) => (
                        <Badge key={index} variant="default" className="bg-primary hover:bg-primary/90">{product}</Badge>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
          </div>
          <DrawerFooter>
            <Button onClick={handleSubmit} disabled={loading || !customerProfile}>
              {loading ? 'Generating...' : 'Get Recommendations'}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
