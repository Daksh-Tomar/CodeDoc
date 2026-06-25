import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const token = this.extractTokenFromSocket(client);
      
      if (!token) {
        throw new WsException('Unauthorized access');
      }

      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
      return true;
    } catch (err) {
      this.logger.error(`WebSocket Authentication failed: ${err.message}`);
      throw new WsException('Unauthorized access');
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const auth = client.handshake?.auth;
    if (auth && auth.token) {
      return auth.token;
    }
    const query = client.handshake?.query;
    if (query && query.token) {
        return query.token as string;
    }
    const headers = client.handshake?.headers;
    if (headers && headers.authorization) {
        return headers.authorization.split(' ')[1];
    }
    return undefined;
  }
}
