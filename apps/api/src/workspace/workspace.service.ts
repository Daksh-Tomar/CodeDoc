import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private readonly workspacesRoot = path.join('c:', 'Users', 'todak', 'Desktop', 'CodeDoc', 'workspaces');

  constructor() {
    this.ensureWorkspacesRoot();
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
    } catch (error) {
      this.logger.error(`Failed to create workspace ${workspaceId}`, error);
      throw error;
    }
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspacePath = this.getWorkspacePath(workspaceId);
    try {
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
