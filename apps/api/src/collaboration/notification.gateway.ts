import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: '*' } })
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {}

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string, workspaceId?: string }) {
    // Users join their own personal room to receive direct mentions
    client.join(`user_${data.userId}`);
    if (data.workspaceId) {
      // Users also join the workspace room to receive workspace-wide alerts
      client.join(`workspace_${data.workspaceId}`);
    }
  }

  /**
   * Pushes a real-time notification to a specific user and saves it to the DB.
   */
  async notifyUser(userId: string, type: NotificationType, content: string, workspaceId?: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, content, workspaceId }
    });

    this.server.to(`user_${userId}`).emit('new_notification', notification);
    return notification;
  }
}
