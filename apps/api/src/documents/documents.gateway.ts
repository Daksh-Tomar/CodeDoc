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
import * as Y from 'yjs';

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
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', 
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e'
];

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
<<<<<<< HEAD
=======
  private ydocs = new Map<string, Y.Doc>();
  private saveInterval: NodeJS.Timeout;

  private lastSummarizedContent = new Map<string, string>();
  private documentDebounceTimers = new Map<string, NodeJS.Timeout>();
  private lastEditorForDocument = new Map<string, string>();
>>>>>>> feature/phase-4-yjs

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {
    // Auto-save all dirty documents to database every 5 seconds
    this.saveInterval = setInterval(() => this.saveAllDocuments(), 5000);
  }

  async saveAllDocuments() {
    for (const [documentId, ydoc] of this.ydocs.entries()) {
      const content = ydoc.getText('monaco').toString();
      try {
        await this.prisma.fileNode.update({
          where: { id: documentId },
          data: { content },
        });
      } catch (err) {
        this.logger.error(`Failed to auto-save ${documentId}: ${err.message}`);
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
<<<<<<< HEAD
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
=======
      if (user.documentId) {
        this.broadcastActiveUsers(user.documentId);
      }
      if (user.projectId) {
        this.broadcastProjectUsers(user.projectId);
      }
>>>>>>> feature/phase-4-yjs
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinProject')
  handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
<<<<<<< HEAD
    try {
      await this.prisma.fileNode.update({
        where: { id: data.documentId },
        data: { content: data.content },
      });
      return { event: 'saveSuccess', data: { documentId: data.documentId } };
    } catch (error) {
      this.logger.error(`Error saving document ${data.documentId}: ${error.message}`);
      return { event: 'saveError', data: { message: 'Failed to save document' } };
=======
    client.join(`project:${data.projectId}`);
    
    // Check if user exists (might have joined a document already)
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
>>>>>>> feature/phase-4-yjs
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
      // We might want to remove them entirely if they also left all docs,
      // but for simplicity, we'll keep the object if they are still connected
    }
    this.broadcastProjectUsers(data.projectId);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('joinDocument')
  async handleJoinDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(data.documentId);
    const existingUser = this.activeUsers.get(client.id);
    
    if (existingUser) {
      existingUser.documentId = data.documentId;
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
      });
    }

    this.broadcastActiveUsers(data.documentId);
    const updatedUser = this.activeUsers.get(client.id);
    if (updatedUser?.projectId) {
      this.broadcastProjectUsers(updatedUser.projectId);
    }

    // Yjs Initialization
    let ydoc = this.ydocs.get(data.documentId);
    if (!ydoc) {
      ydoc = new Y.Doc();
      try {
        const file = await this.prisma.fileNode.findUnique({ where: { id: data.documentId } });
        if (file && file.content) {
          ydoc.getText('monaco').insert(0, file.content);
        }
      } catch (e) {
        this.logger.error(`Error loading document ${data.documentId} from DB: ${e.message}`);
      }
      // Re-check just in case another client created it while we were awaiting DB
      if (!this.ydocs.has(data.documentId)) {
        this.ydocs.set(data.documentId, ydoc);
        this.lastSummarizedContent.set(data.documentId, ydoc.getText('monaco').toString());
      } else {
        ydoc = this.ydocs.get(data.documentId)!;
      }
    }

    const stateVector = Y.encodeStateAsUpdate(ydoc);
    client.emit('yjsInit', { documentId: data.documentId, update: Array.from(stateVector) });
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('requestYjsInit')
  handleRequestYjsInit(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const ydoc = this.ydocs.get(data.documentId);
    if (ydoc) {
      const stateVector = Y.encodeStateAsUpdate(ydoc);
      client.emit('yjsInit', { documentId: data.documentId, update: Array.from(stateVector) });
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leaveDocument')
  handleLeaveDocument(
    @MessageBody() data: { documentId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(data.documentId);
    const user = this.activeUsers.get(client.id);
    if (user) {
      user.documentId = null;
      this.broadcastActiveUsers(data.documentId);
      if (user.projectId) {
        this.broadcastProjectUsers(user.projectId);
      }
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('yjsUpdate')
  handleYjsUpdate(
    @MessageBody() data: { documentId: string; update: number[] },
    @ConnectedSocket() client: Socket,
  ) {
    const ydoc = this.ydocs.get(data.documentId);
    const user = this.activeUsers.get(client.id);

    if (ydoc) {
      try {
        const updateArray = new Uint8Array(data.update);
        Y.applyUpdate(ydoc, updateArray);
        // Broadcast to other clients in the room
        client.to(data.documentId).emit('yjsUpdate', { documentId: data.documentId, update: data.update });

        if (user) {
          this.triggerDebouncedSummary(data.documentId, user.userId, user.projectId);
        }
      } catch (e) {
        this.logger.error(`Failed to apply Yjs update: ${e.message}`);
      }
    }
  }

  private triggerDebouncedSummary(documentId: string, userId: string, projectId?: string) {
    this.lastEditorForDocument.set(documentId, userId);

    if (this.documentDebounceTimers.has(documentId)) {
      clearTimeout(this.documentDebounceTimers.get(documentId)!);
    }

    const timer = setTimeout(() => {
      this.generateAndBroadcastSummary(documentId, projectId);
    }, 10000); // 10 seconds debounce

    this.documentDebounceTimers.set(documentId, timer);
  }

  private async generateAndBroadcastSummary(documentId: string, projectId?: string) {
    this.documentDebounceTimers.delete(documentId);
    
    const ydoc = this.ydocs.get(documentId);
    if (!ydoc) return;

    const currentContent = ydoc.getText('monaco').toString();
    const oldContent = this.lastSummarizedContent.get(documentId) || '';

    if (currentContent === oldContent) return;

    this.lastSummarizedContent.set(documentId, currentContent);
    const userId = this.lastEditorForDocument.get(documentId);
    if (!userId) return;

    try {
      const fileNode = await this.prisma.fileNode.findUnique({
        where: { id: documentId },
        select: { name: true, projectId: true, project: { select: { workspaceId: true } } }
      });

      const actualProjectId = projectId || fileNode?.projectId;
      const workspaceId = fileNode?.project?.workspaceId;
      
      if (!workspaceId) {
        this.logger.warn(`Cannot create activity: No workspaceId found for document ${documentId}`);
        return;
      }

      // Quick diff/summary request
      const promptContext = `Old Content:\n${oldContent.substring(0, 1000)}\n\nNew Content:\n${currentContent.substring(0, 1000)}\n\nDescribe the main change made in one brief sentence.`;
      const aiSummary = await this.aiService.generateSummary(promptContext);

      // Create activity
      const activity = await this.prisma.activity.create({
        data: {
          type: 'FILE_MODIFIED',
          description: `Updated ${fileNode?.name || 'file'}`,
          aiSummary,
          workspaceId: workspaceId,
          userId: userId,
          fileNodeId: documentId,
        },
        include: {
          user: { select: { name: true, email: true } },
          fileNode: { select: { name: true } }
        }
      });

      // Broadcast to all connected clients since we use a unified workspace
      this.server.emit('newActivity', activity);
    } catch (e) {
      this.logger.error(`Error generating AI summary for ${documentId}: ${e.message}`);
    }
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

  private broadcastActiveUsers(documentId: string) {
    const usersInDoc = Array.from(this.activeUsers.values()).filter(
      (u) => u.documentId === documentId
    );
    this.server.to(documentId).emit('activeUsers', usersInDoc);
  }

  private broadcastProjectUsers(projectId: string) {
    const usersInProject = Array.from(this.activeUsers.values()).filter(
      (u) => u.projectId === projectId
    );
    this.server.to(`project:${projectId}`).emit('projectUsers', usersInProject);
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
