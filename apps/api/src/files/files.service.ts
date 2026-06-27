import { Injectable, NotFoundException, BadRequestException, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceService } from '../workspace/workspace.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as chokidar from 'chokidar';

export interface FileNodeDTO {
  id: string; // The relative file path
  name: string;
  type: 'FILE' | 'FOLDER';
  parentId: string | null;
  projectId: string; // Wait, actually workspaceId or projectId
}

@Injectable()
export class FilesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FilesService.name);
  private watchers = new Map<string, chokidar.FSWatcher>();

  constructor(
    private prisma: PrismaService,
    private workspaceService: WorkspaceService
  ) {}

  onModuleInit() {
    // Setup watchers for existing workspaces or handle them dynamically
  }

  onModuleDestroy() {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
  }

  // Set up a workspace watcher that broadcasts to a callback or gateway
  watchWorkspace(workspaceId: string, callback: (event: string, filePath: string) => void) {
    if (this.watchers.has(workspaceId)) return;

    const workspacePath = this.workspaceService.getWorkspacePath(workspaceId);
    const watcher = chokidar.watch(workspacePath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    watcher
      .on('add', (p) => callback('add', path.relative(workspacePath, p).replace(/\\/g, '/')))
      .on('change', (p) => callback('change', path.relative(workspacePath, p).replace(/\\/g, '/')))
      .on('unlink', (p) => callback('unlink', path.relative(workspacePath, p).replace(/\\/g, '/')))
      .on('addDir', (p) => callback('addDir', path.relative(workspacePath, p).replace(/\\/g, '/')))
      .on('unlinkDir', (p) => callback('unlinkDir', path.relative(workspacePath, p).replace(/\\/g, '/')));

    this.watchers.set(workspaceId, watcher);
    this.logger.log(`Started watching workspace ${workspaceId}`);
  }

  async getProjectFiles(projectId: string): Promise<FileNodeDTO[]> {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const workspaceId = project.workspaceId;
    const workspacePath = this.workspaceService.getWorkspacePath(workspaceId);
    
    // Ensure the workspace directory exists
    try {
      await fs.access(workspacePath);
    } catch {
      await this.workspaceService.createWorkspaceDir(workspaceId);
    }

    const files: FileNodeDTO[] = [];
    
    async function traverse(currentPath: string, parentId: string | null) {
      const items = await fs.readdir(currentPath, { withFileTypes: true });
      for (const item of items) {
        if (item.name.startsWith('.')) continue; // skip hidden files like .git
        
        const relativePath = path.relative(workspacePath, path.join(currentPath, item.name)).replace(/\\/g, '/');
        const isFolder = item.isDirectory();
        
        files.push({
          id: relativePath,
          name: item.name,
          type: isFolder ? 'FOLDER' : 'FILE',
          parentId,
          projectId
        });

        if (isFolder) {
          await traverse(path.join(currentPath, item.name), relativePath);
        }
      }
    }

    await traverse(workspacePath, null);
    
    return files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'FOLDER' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  async getFile(workspaceId: string, filePath: string) {
    try {
      const content = await this.workspaceService.readFile(workspaceId, filePath);
      return { id: filePath, name: path.basename(filePath), content };
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  async createFile(projectId: string, data: { name: string; type: 'FILE' | 'FOLDER'; parentId?: string; content?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const workspaceId = project.workspaceId;
    const relativeDir = data.parentId ? data.parentId : '';
    const filePath = path.join(relativeDir, data.name).replace(/\\/g, '/');

    if (data.type === 'FOLDER') {
      const fullPath = this.workspaceService.getFilePath(workspaceId, filePath);
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await this.workspaceService.writeFile(workspaceId, filePath, data.content || '');
    }

    return {
      id: filePath,
      name: data.name,
      type: data.type,
      parentId: data.parentId || null,
      projectId
    };
  }
}
