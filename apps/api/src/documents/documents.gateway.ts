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

interface CursorPosition {
  lineNumber: number;
  column: number;
  selectionStartLineNumber?: number;
  selectionStartColumn?: number;
}

interface ActiveUser {
  socketId: string;
  userId: string;
  email: string;
  color: string;
  cursor: CursorPosition | null;
  documentId: string;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'
];

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class DocumentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DocumentsGateway.name);
  private activeUsers = new Map<string, ActiveUser>();

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
    const user = this.activeUsers.get(client.id);
    if (user) {
      this.activeUsers.delete(client.id);
      this.broadcastActiveUsers(user.documentId);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinDocument')
  handleJoinDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.documentId);
    const userId = client.data.user.sub;
    const email = client.data.user.email;
    
    // Pick a deterministic color based on userId length or hash, or just random
    // We will use a random pleasant color
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    this.activeUsers.set(client.id, {
      socketId: client.id,
      userId,
      email,
      color,
      cursor: null,
      documentId: data.documentId,
    });

    this.broadcastActiveUsers(data.documentId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveDocument')
  handleLeaveDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.documentId);
    this.activeUsers.delete(client.id);
    this.broadcastActiveUsers(data.documentId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('cursorMove')
  handleCursorMove(
    @MessageBody() data: { documentId: string; cursor: CursorPosition },
    @ConnectedSocket() client: Socket,
  ) {
    const user = this.activeUsers.get(client.id);
    if (user) {
      user.cursor = data.cursor;
      // Broadcast cursor to everyone else in the document
      client.to(data.documentId).emit('cursorMoved', {
        userId: user.userId,
        socketId: client.id,
        cursor: data.cursor,
      });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('saveDocument')
  async handleSaveDocument(
    @MessageBody() data: { documentId: string; content: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.prisma.fileNode.update({
        where: { id: data.documentId },
        data: { content: data.content },
      });
      return { event: 'saveSuccess', data: { documentId: data.documentId } };
    } catch (error) {
      this.logger.error(`Error saving document ${data.documentId}: ${error.message}`);
      return { event: 'saveError', data: { message: 'Failed to save document' } };
    }
  }

  private broadcastActiveUsers(documentId: string) {
    const usersInDoc = Array.from(this.activeUsers.values()).filter(
      (u) => u.documentId === documentId
    );
    this.server.to(documentId).emit('activeUsers', usersInDoc);
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
