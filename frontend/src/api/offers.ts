import { apiRequest } from './client';

export type OfferStatus = 'ATIVA' | 'ENCERRADA';

export type Offer = {
  id: string;
  title: string;
  description: string;
  priceInCents: number;
  discountPercentage: number;
  stock: number;
  expiresAt: string;
  status: OfferStatus;
  shopkeeperId: string;
  shopkeeper?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type ShopkeeperOffer = Offer & {
  interestedCount: number;
};

export type CreateOfferPayload = {
  title: string;
  description: string;
  priceInCents: number;
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

export type Interest = {
  id: string;
  buyerId: string;
  offerId: string;
  createdAt: string;
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  offer: {
    id: string;
    shopkeeperId: string;
    title: string;
    stock: number;
  };
};

export function createInterest(offerId: string, token: string) {
  return apiRequest<Interest>(`/offers/${offerId}/interests`, {
    method: 'POST',
    token,
  });
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
