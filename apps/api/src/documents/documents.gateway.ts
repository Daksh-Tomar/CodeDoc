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
import { AiService } from '../ai/ai.service';
import { WorkspaceService } from '../workspace/workspace.service';
import * as Y from 'yjs';
import * as path from 'path';

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
  documentId: string | null;
  projectId?: string;
  workspaceId?: string;
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
  private ydocs = new Map<string, Y.Doc>();
  private saveInterval: NodeJS.Timeout;

  private lastSummarizedContent = new Map<string, string>();
  private documentDebounceTimers = new Map<string, NodeJS.Timeout>();
  private lastEditorForDocument = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly workspaceService: WorkspaceService,
  ) {
    // Auto-save all dirty documents to filesystem every 5 seconds
    this.saveInterval = setInterval(() => this.saveAllDocuments(), 5000);
  }

  async saveAllDocuments() {
    for (const [docKey, ydoc] of this.ydocs.entries()) {
      const content = ydoc.getText('monaco').toString();
      try {
        const [workspaceId, ...pathParts] = docKey.split(':');
        const filePath = pathParts.join(':');
        if (!workspaceId || !filePath) continue;

        await this.workspaceService.writeFile(workspaceId, filePath, content);
      } catch (err) {
        this.logger.error(`Failed to auto-save ${docKey}: ${err.message}`);
      }
    }
  }

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
      if (user.documentId && user.workspaceId) {
        this.broadcastActiveUsers(`${user.workspaceId}:${user.documentId}`);
      }
      if (user.projectId) {
        this.broadcastProjectUsers(user.projectId);
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinProject')
  handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`project:${data.projectId}`);
    
    const existingUser = this.activeUsers.get(client.id);
    if (existingUser) {
      existingUser.projectId = data.projectId;
    } else {
      const userId = client.data.user.sub;
      const email = client.data.user.email;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      this.activeUsers.set(client.id, {
        socketId: client.id,
        userId,
        email,
        color,
        cursor: null,
        documentId: null,
        projectId: data.projectId,
      });
    }

    this.broadcastProjectUsers(data.projectId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`project:${data.projectId}`);
    const user = this.activeUsers.get(client.id);
    if (user) {
      user.projectId = undefined;
    }
    this.broadcastProjectUsers(data.projectId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinDocument')
  async handleJoinDocument(
    @MessageBody() data: { documentId: string; workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const docKey = `${data.workspaceId}:${data.documentId}`;
    client.join(docKey);
    const existingUser = this.activeUsers.get(client.id);
    
    if (existingUser) {
      existingUser.documentId = data.documentId;
      existingUser.workspaceId = data.workspaceId;
    } else {
      const userId = client.data.user.sub;
      const email = client.data.user.email;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];

      this.activeUsers.set(client.id, {
        socketId: client.id,
        userId,
        email,
        color,
        cursor: null,
        documentId: data.documentId,
        workspaceId: data.workspaceId,
      });
    }

    this.broadcastActiveUsers(docKey);
    const updatedUser = this.activeUsers.get(client.id);
    if (updatedUser?.projectId) {
      this.broadcastProjectUsers(updatedUser.projectId);
    }

    // Yjs Initialization
    let ydoc = this.ydocs.get(docKey);
    if (!ydoc) {
      ydoc = new Y.Doc();
      try {
        const content = await this.workspaceService.readFile(data.workspaceId, data.documentId);
        ydoc.getText('monaco').insert(0, content);
      } catch (e) {
        this.logger.warn(`Error loading document ${docKey} from FS: ${e.message}`);
      }
      if (!this.ydocs.has(docKey)) {
        this.ydocs.set(docKey, ydoc);
        this.lastSummarizedContent.set(docKey, ydoc.getText('monaco').toString());
      } else {
        ydoc = this.ydocs.get(docKey)!;
      }
    }

    const stateVector = Y.encodeStateAsUpdate(ydoc);
    client.emit('yjsInit', { documentId: docKey, update: Array.from(stateVector) });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('requestYjsInit')
  handleRequestYjsInit(
    @MessageBody() data: { documentId: string; workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const docKey = `${data.workspaceId}:${data.documentId}`;
    const ydoc = this.ydocs.get(docKey);
    if (ydoc) {
      const stateVector = Y.encodeStateAsUpdate(ydoc);
      client.emit('yjsInit', { documentId: docKey, update: Array.from(stateVector) });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveDocument')
  handleLeaveDocument(
    @MessageBody() data: { documentId: string; workspaceId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const docKey = `${data.workspaceId}:${data.documentId}`;
    client.leave(docKey);
    const user = this.activeUsers.get(client.id);
    if (user) {
      user.documentId = null;
      this.broadcastActiveUsers(docKey);
      if (user.projectId) {
        this.broadcastProjectUsers(user.projectId);
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('yjsUpdate')
  handleYjsUpdate(
    @MessageBody() data: { documentId: string; workspaceId: string; update: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const docKey = `${data.workspaceId}:${data.documentId}`;
    const ydoc = this.ydocs.get(docKey);
    const user = this.activeUsers.get(client.id);

    if (ydoc) {
      try {
        const updateArray = new Uint8Array(data.update);
        Y.applyUpdate(ydoc, updateArray);
        // Broadcast to other clients in the room
        client.to(docKey).emit('yjsUpdate', { documentId: docKey, update: data.update });

        if (user) {
          this.triggerDebouncedSummary(docKey, user.userId, user.projectId);
        }
      } catch (e) {
        this.logger.error(`Failed to apply Yjs update: ${e.message}`);
      }
    }
  }

  private triggerDebouncedSummary(docKey: string, userId: string, projectId?: string) {
    this.lastEditorForDocument.set(docKey, userId);

    if (this.documentDebounceTimers.has(docKey)) {
      clearTimeout(this.documentDebounceTimers.get(docKey)!);
    }

    const timer = setTimeout(() => {
      this.generateAndBroadcastSummary(docKey, projectId);
    }, 10000); // 10 seconds debounce

    this.documentDebounceTimers.set(docKey, timer);
  }

  private async generateAndBroadcastSummary(docKey: string, projectId?: string) {
    this.documentDebounceTimers.delete(docKey);
    
    const ydoc = this.ydocs.get(docKey);
    if (!ydoc) return;

    const currentContent = ydoc.getText('monaco').toString();
    const oldContent = this.lastSummarizedContent.get(docKey) || '';

    if (currentContent === oldContent) return;

    this.lastSummarizedContent.set(docKey, currentContent);
    const userId = this.lastEditorForDocument.get(docKey);
    if (!userId) return;

    try {
      const [workspaceId, ...pathParts] = docKey.split(':');
      const filePath = pathParts.join(':');

      // Quick diff/summary request
      const promptContext = `Old Content:\n${oldContent.substring(0, 1000)}\n\nNew Content:\n${currentContent.substring(0, 1000)}\n\nDescribe the main change made in one brief sentence.`;
      const aiSummary = await this.aiService.generateSummary(promptContext);

      // Create activity
      const activity = await this.prisma.activity.create({
        data: {
          type: 'FILE_MODIFIED',
          description: `Updated ${path.basename(filePath)}`,
          aiSummary,
          workspaceId: workspaceId,
          userId: userId,
          filePath: filePath,
        },
        include: {
          user: { select: { name: true, email: true } },
        }
      });

      // Broadcast to all connected clients since we use a unified workspace
      this.server.emit('newActivity', activity);
    } catch (e) {
      this.logger.error(`Error generating AI summary for ${docKey}: ${e.message}`);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('cursorMove')
  handleCursorMove(
    @MessageBody() data: { documentId: string; workspaceId: string; cursor: CursorPosition },
    @ConnectedSocket() client: Socket,
  ) {
    const docKey = `${data.workspaceId}:${data.documentId}`;
    const user = this.activeUsers.get(client.id);
    if (user) {
      user.cursor = data.cursor;
      client.to(docKey).emit('cursorMoved', {
        userId: user.userId,
        socketId: client.id,
        cursor: data.cursor,
      });
    }
  }

  private broadcastActiveUsers(docKey: string) {
    const usersInDoc = Array.from(this.activeUsers.values()).filter(
      (u) => `${u.workspaceId}:${u.documentId}` === docKey
    );
    this.server.to(docKey).emit('activeUsers', usersInDoc);
  }

  private broadcastProjectUsers(projectId: string) {
    const usersInProject = Array.from(this.activeUsers.values()).filter(
      (u) => u.projectId === projectId
    );
    this.server.to(`project:${projectId}`).emit('projectUsers', usersInProject);
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
