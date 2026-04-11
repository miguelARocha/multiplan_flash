import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type { OfferResponseDto } from './dto/offer-response.dto';

const BUYERS_ROOM = 'buyers';

@WebSocketGateway({
  namespace: 'offers',
  cors: {
    origin: process.env.ORIGEM_FRONTEND ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class OffersGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(@ConnectedSocket() client: Socket) {
    const currentUser = this.getUserFromHandshake(client);

    if (currentUser?.role !== UserRole.COMPRADOR) {
      client.disconnect(true);
      return;
    }

    void client.join(BUYERS_ROOM);
  }

  notifyOfferCreated(offer: OfferResponseDto) {
    this.server.to(BUYERS_ROOM).emit('offer.created', offer);
  }

  private getUserFromHandshake(client: Socket): AuthenticatedUser | null {
    const token = this.extractToken(client);

    if (!token) {
      return null;
    }

    try {
      return this.jwtService.verify<AuthenticatedUser>(token);
    } catch {
      return null;
    }
  }

  private extractToken(client: Socket) {
    const authToken = client.handshake.auth.token;
    const queryToken = client.handshake.query.token;
    const authorization = client.handshake.headers.authorization;

    if (typeof authToken === 'string') {
      return authToken;
    }

    if (typeof queryToken === 'string') {
      return queryToken;
    }

    if (typeof authorization === 'string') {
      return authorization.replace(/^Bearer\s+/i, '');
    }

    return null;
  }
}
