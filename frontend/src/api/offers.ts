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

export type ShopkeeperOffer = Offer & {
  interestedCount: number;
};

export type CreateOfferPayload = {
  title: string;
  description: string;
  discountPercentage: number;
  stock: number;
  expiresAt: string;
};

export type UpdateOfferPayload = Partial<CreateOfferPayload> & {
  status?: OfferStatus;
};

export function listActiveOffers() {
  return apiRequest<Offer[]>('/offers?status=ATIVA');
}

export function listMyOffers(token: string) {
  return apiRequest<ShopkeeperOffer[]>('/offers/mine', { token });
}

export function createOffer(payload: CreateOfferPayload, token: string) {
  return apiRequest<Offer>('/offers', {
    method: 'POST',
    token,
    body: JSON.stringify(payload),
  });
}

export function closeOffer(offerId: string, token: string) {
  return apiRequest<Offer>(`/offers/${offerId}/close`, {
    method: 'PATCH',
    token,
  });
}

export function updateOffer(offerId: string, payload: UpdateOfferPayload, token: string) {
  return apiRequest<Offer>(`/offers/${offerId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteOffer(offerId: string, token: string) {
  return apiRequest<void>(`/offers/${offerId}`, {
    method: 'DELETE',
    token,
  });
}
