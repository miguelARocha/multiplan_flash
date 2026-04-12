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
import type { InterestResponseDto } from '../interests/dto/interest-response.dto';
import type { OfferResponseDto } from './dto/offer-response.dto';

const BUYERS_ROOM = 'buyers';
const shopkeeperRoom = (shopkeeperId: string) => `shopkeeper:${shopkeeperId}`;

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

    if (!currentUser) {
      client.disconnect(true);
      return;
    }

    if (currentUser.role === UserRole.COMPRADOR) {
      void client.join(BUYERS_ROOM);
      return;
    }

    if (currentUser.role === UserRole.LOJISTA) {
      void client.join(shopkeeperRoom(currentUser.sub));
      return;
    }

    client.disconnect(true);
  }

  notifyOfferCreated(offer: OfferResponseDto) {
    this.server.to(BUYERS_ROOM).emit('offer.created', offer);
  }

  notifyOfferUpdated(offer: OfferResponseDto) {
    this.server.to(BUYERS_ROOM).emit('offer.updated', offer);
  }

  notifyInterestCreated(interest: InterestResponseDto) {
    this.server
      .to(shopkeeperRoom(interest.offer.shopkeeperId))
      .emit('interest.created', interest);
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
