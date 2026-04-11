import { UserRole } from '@prisma/client';
import { OffersGateway } from './offers.gateway';

describe('OffersGateway', () => {
  const jwtServiceMock = {
    verify: jest.fn(),
  };

  const serverMock = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  let offersGateway: OffersGateway;

  beforeEach(() => {
    jwtServiceMock.verify.mockReset();
    serverMock.to.mockClear();
    serverMock.emit.mockClear();
    offersGateway = new OffersGateway(jwtServiceMock as never);
    Object.assign(offersGateway, { server: serverMock });
  });

  it('deve conectar comprador autenticado na sala de compradores', () => {
    const client = buildClient({ auth: { token: 'buyer-token' } });
    jwtServiceMock.verify.mockReturnValue({
      sub: 'buyer-1',
      email: 'comprador@empresa.com',
      role: UserRole.COMPRADOR,
    });

    offersGateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith('buyers');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('deve conectar lojista autenticado na propria sala', () => {
    const client = buildClient({ auth: { token: 'shopkeeper-token' } });
    jwtServiceMock.verify.mockReturnValue({
      sub: 'shopkeeper-1',
      email: 'lojista@empresa.com',
      role: UserRole.LOJISTA,
    });

    offersGateway.handleConnection(client as never);

    expect(client.join).toHaveBeenCalledWith('shopkeeper:shopkeeper-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('deve desconectar cliente com token invalido', () => {
    const client = buildClient({ auth: { token: 'invalid-token' } });
    jwtServiceMock.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });

    offersGateway.handleConnection(client as never);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });

  it('deve notificar compradores quando oferta for criada', () => {
    const offer = {
      id: 'offer-1',
      title: 'Oferta nova',
    };

    offersGateway.notifyOfferCreated(offer as never);

    expect(serverMock.to).toHaveBeenCalledWith('buyers');
    expect(serverMock.emit).toHaveBeenCalledWith('offer.created', offer);
  });

  it('deve notificar lojista quando oferta receber interesse', () => {
    const interest = {
      id: 'interest-1',
      offer: {
        shopkeeperId: 'shopkeeper-1',
      },
    };

    offersGateway.notifyInterestCreated(interest as never);

    expect(serverMock.to).toHaveBeenCalledWith('shopkeeper:shopkeeper-1');
    expect(serverMock.emit).toHaveBeenCalledWith('interest.created', interest);
  });

  function buildClient(handshake: {
    auth?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
  }) {
    return {
      handshake: {
        auth: handshake.auth ?? {},
        query: handshake.query ?? {},
        headers: handshake.headers ?? {},
      },
      join: jest.fn(),
      disconnect: jest.fn(),
    };
  }
});
