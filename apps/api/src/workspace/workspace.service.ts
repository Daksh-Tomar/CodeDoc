import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';

@Injectable()
export class WorkspaceService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly workspacesRoot = path.join('c:', 'Users', 'todak', 'Desktop', 'CodeDoc', 'workspaces');
  private watchers = new Map<string, chokidar.FSWatcher>();

  constructor() {
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

  async createWorkspace(workspaceId: string): Promise<void> {
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
      this.logger.log(`Deleted workspace directory for ${workspaceId}`);
    } catch (error) {
      this.logger.error(`Failed to delete workspace ${workspaceId}`, error);
      throw error;
    }
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
