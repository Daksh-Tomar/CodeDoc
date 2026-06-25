import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { WsJwtGuard } from '../auth/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: '*', // Should be configured based on frontend URL
  },
})
export class DocumentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DocumentsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.disconnect();
        return;
      }
      
      const payload = await this.jwtService.verifyAsync(token);
      client.data.user = payload;
      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub || payload.email})`);
    } catch (err) {
      this.logger.warn(`Connection rejected: Invalid token (${client.id})`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('saveDocument')
  async handleSaveDocument(
    @MessageBody() data: { documentId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Saving document ${data.documentId} by user ${client.data.user?.sub}`);
    
    try {
      await this.prisma.fileNode.update({
        where: { id: data.documentId },
        data: { content: data.content },
      });
      // Optionally broadcast to other clients in a room
      // client.to(data.documentId).emit('documentUpdated', data);
      return { event: 'saveSuccess', data: { documentId: data.documentId } };
    } catch (error) {
      this.logger.error(`Error saving document ${data.documentId}: ${error.message}`);
      return { event: 'saveError', data: { message: 'Failed to save document' } };
    }
  }

  private extractTokenFromSocket(client: Socket): string | undefined {
    const auth = client.handshake?.auth;
    if (auth && auth.token) return auth.token;
    
    const query = client.handshake?.query;
    if (query && query.token) return query.token as string;
    
    const headers = client.handshake?.headers;
    if (headers && headers.authorization) return headers.authorization.split(' ')[1];
    
    return undefined;
  }
}
