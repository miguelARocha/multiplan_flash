import { apiRequest } from './client';

export type OfferStatus = 'ATIVA' | 'ENCERRADA';

export type Offer = {
  id: string;
  title: string;
  description: string;
  discountPercentage: number;
  stock: number;
  expiresAt: string;
  status: OfferStatus;
  shopkeeperId: string;
  createdAt: string;
  updatedAt: string;
};

export function listActiveOffers() {
  return apiRequest<Offer[]>('/offers?status=ATIVA');
}
