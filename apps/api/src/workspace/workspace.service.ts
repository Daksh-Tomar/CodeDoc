import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceRole, RoleRequestStatus } from '@prisma/client';

@Injectable()
export class WorkspaceService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly workspacesRoot = process.env.WORKSPACES_ROOT || path.join(process.cwd(), 'workspaces');
  private watchers = new Map<string, chokidar.FSWatcher>();

  constructor(private readonly prisma: PrismaService) {
    super();
    this.ensureWorkspacesRoot();
  }

  async onModuleDestroy() {
    for (const watcher of this.watchers.values()) {
      await watcher.close();
    }
  }

  private async ensureWorkspacesRoot() {
    try {
      await fs.mkdir(this.workspacesRoot, { recursive: true });
    } catch (error) {
      this.logger.error(`Failed to create workspaces root at ${this.workspacesRoot}`, error);
    }
  }

  getWorkspacePath(workspaceId: string): string {
    // Validate workspaceId to prevent directory traversal
    if (workspaceId.includes('..') || workspaceId.includes('/') || workspaceId.includes('\\')) {
      throw new BadRequestException('Invalid workspace ID');
    }
    return path.join(this.workspacesRoot, workspaceId);
  }

  getFilePath(workspaceId: string, filePath: string): string {
    const workspacePath = this.getWorkspacePath(workspaceId);
    const absolutePath = path.join(workspacePath, filePath);
    
    // Ensure the resolved path is within the workspace directory
    if (!absolutePath.startsWith(workspacePath)) {
      throw new BadRequestException('Invalid file path');
    }
    return absolutePath;
  }

  async getUserWorkspaces(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        owner: true,
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async createWorkspace(ownerId: string, name: string) {
    const workspace = await this.prisma.workspace.create({
      data: {
        name,
        ownerId,
        members: {
          create: {
            userId: ownerId,
            role: WorkspaceRole.OWNER,
          },
        },
        projects: {
          create: {
            name: 'Default Project',
          },
        },
      },
    });

    await this.createWorkspaceDir(workspace.id);
    return workspace;
  }

  async getWorkspaceDetails(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: { user: true },
        },
        projects: true,
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async createWorkspaceDir(workspaceId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(workspaceId);
    try {
      await fs.mkdir(workspacePath, { recursive: true });
      this.logger.log(`Created workspace directory for ${workspaceId}`);
      this.watchWorkspace(workspaceId);
    } catch (error) {
      this.logger.error(`Failed to create workspace ${workspaceId}`, error);
      throw error;
    }
  }

  watchWorkspace(workspaceId: string) {
    if (this.watchers.has(workspaceId)) return;
    
    const workspacePath = this.getWorkspacePath(workspaceId);
    const watcher = chokidar.watch(workspacePath, {
      ignoreInitial: true,
      persistent: true,
    });

    watcher.on('all', (event, filePath) => {
      // Map chokidar events to our standard events
      let customEvent = '';
      if (event === 'add' || event === 'addDir') customEvent = 'FILE_CREATED';
      else if (event === 'unlink' || event === 'unlinkDir') customEvent = 'FILE_DELETED';
      else if (event === 'change') customEvent = 'FILE_MODIFIED';
      
      if (customEvent) {
        // Compute relative path
        const relativePath = path.relative(workspacePath, filePath).replace(/\\/g, '/');
        this.emit('fileSystemEvent', {
          workspaceId,
          type: customEvent,
          path: relativePath,
        });
      }
    });

    this.watchers.set(workspaceId, watcher);
    this.logger.log(`Started watching workspace ${workspaceId}`);
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(workspaceId);
    try {
      const watcher = this.watchers.get(workspaceId);
      if (watcher) {
        await watcher.close();
        this.watchers.delete(workspaceId);
      }
      await fs.rm(workspacePath, { recursive: true, force: true });
      await this.prisma.workspace.delete({ where: { id: workspaceId } });
      this.logger.log(`Deleted workspace directory and DB record for ${workspaceId}`);
    } catch (error) {
      this.logger.error(`Failed to delete workspace ${workspaceId}`, error);
      throw error;
    }
  }

  async inviteUser(workspaceId: string, email: string, role: WorkspaceRole) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role,
      },
    });
  }

  async createRoleRequest(workspaceId: string, userId: string, requestedRole: WorkspaceRole) {
    return this.prisma.roleRequest.create({
      data: {
        workspaceId,
        requesterId: userId,
        requestedRole,
      },
    });
  }

  async getRoleRequests(workspaceId: string) {
    return this.prisma.roleRequest.findMany({
      where: { workspaceId, status: RoleRequestStatus.PENDING },
      include: { requester: true },
    });
  }

  async reviewRoleRequest(requestId: string, reviewerId: string, approve: boolean) {
    const request = await this.prisma.roleRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Role request not found');

    const status = approve ? RoleRequestStatus.APPROVED : RoleRequestStatus.REJECTED;

    await this.prisma.roleRequest.update({
      where: { id: requestId },
      data: {
        status,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
    });

    if (approve) {
      await this.prisma.workspaceMember.update({
        where: {
          userId_workspaceId: {
            userId: request.requesterId,
            workspaceId: request.workspaceId,
          },
        },
        data: { role: request.requestedRole },
      });
    }
    return { success: true, status };
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: WorkspaceRole) {
    return this.prisma.workspaceMember.update({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
      data: { role },
    });
  }

  async removeMember(workspaceId: string, memberId: string) {
    return this.prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: {
          userId: memberId,
          workspaceId,
        },
      },
    });
  }

  async readFile(workspaceId: string, filePath: string): Promise<string> {
    const fullPath = this.getFilePath(workspaceId, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') throw new NotFoundException('File not found');
      throw error;
    }
  }

  async writeFile(workspaceId: string, filePath: string, content: string): Promise<void> {
    const fullPath = this.getFilePath(workspaceId, filePath);
    const dir = path.dirname(fullPath);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      this.logger.error(`Failed to write file ${filePath} in workspace ${workspaceId}`, error);
      throw error;
    }
  }

  async deleteFile(workspaceId: string, filePath: string): Promise<void> {
    const fullPath = this.getFilePath(workspaceId, filePath);
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath} in workspace ${workspaceId}`, error);
      throw error;
    }
  }

  async renameFile(workspaceId: string, oldPath: string, newPath: string): Promise<void> {
    const fullOldPath = this.getFilePath(workspaceId, oldPath);
    const fullNewPath = this.getFilePath(workspaceId, newPath);
    const dir = path.dirname(fullNewPath);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.rename(fullOldPath, fullNewPath);
    } catch (error) {
      this.logger.error(`Failed to rename file ${oldPath} to ${newPath} in workspace ${workspaceId}`, error);
      throw error;
    }
  }
}
