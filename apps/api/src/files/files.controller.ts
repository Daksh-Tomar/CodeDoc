import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { FilesService } from './files.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('projects/:projectId/files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getProjectFiles(@Param('projectId') projectId: string) {
    return this.filesService.getProjectFiles(projectId);
  }

  @Get(':fileId')
  async getFile(@Param('projectId') projectId: string, @Param('fileId') fileId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    const decodedFilePath = decodeURIComponent(fileId);
    return this.filesService.getFile(project.workspaceId, decodedFilePath);
  }

  @Post()
  createFile(
    @Param('projectId') projectId: string,
    @Body() data: { name: string; type: 'FILE' | 'FOLDER'; parentId?: string; content?: string },
  ) {
    return this.filesService.createFile(projectId, data);
  }
}
