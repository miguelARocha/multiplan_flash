import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000/offers';

export function connectOffersSocket(token: string) {
  return io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
  });
}
