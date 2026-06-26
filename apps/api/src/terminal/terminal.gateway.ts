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
import { ContainerManager } from './container.manager';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({ namespace: '/terminal', cors: { origin: '*' } })
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private activeStreams = new Map<string, any>();

  constructor(
    private containerManager: ContainerManager,
    private prisma: PrismaService,
  ) { }

  async handleConnection(client: Socket) {
    // Basic connection
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('join')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workspaceId: string, userId?: string },
  ) {
    const { workspaceId, userId } = data;

    // Validate permissions if userId is provided, else viewer
    let role = 'VIEWER';
    if (userId) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
      });
      if (member) {
        role = member.role;
      }
    }

    client.data.role = role;
    client.data.workspaceId = workspaceId;
    client.join(workspaceId);

    // Setup terminal stream if not already active
    if (!this.activeStreams.has(workspaceId)) {
      console.log(`Setting up terminal stream for workspace ${workspaceId}`);

      const onData = (chunk: Buffer) => {
        const str = chunk.toString('utf8');
        console.log(`[DOCKER OUT]: ${JSON.stringify(str)}`);
        this.server.to(workspaceId).emit('output', str);
      };

      const stream = await this.containerManager.getContainerStream(workspaceId, onData);
      this.activeStreams.set(workspaceId, stream);
    }

    client.emit('joined', { role });
  }

  @SubscribeMessage('input')
  async handleInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string,
  ) {
    const { role, workspaceId } = client.data;
    if (role === 'VIEWER') {
      return; // Viewers can't type
    }

    const stream = this.activeStreams.get(workspaceId);
    if (stream) {
      console.log(`[DOCKER IN]: ${JSON.stringify(data)}`);
      stream.write(data);
    } else {
      console.warn(`[DOCKER IN]: No stream found for ${workspaceId}`);
    }
  }
}
