import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FileNodeType } from '@prisma/client';

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async getProjectFiles(projectId: string) {
    return this.prisma.fileNode.findMany({
      where: { projectId },
      orderBy: [
        { type: 'asc' }, // FOLDER comes before FILE generally in string comparison, but let's just do it by name
        { name: 'asc' }
      ],
    });
  }

  async getFile(fileId: string) {
    const file = await this.prisma.fileNode.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async createFile(projectId: string, data: { name: string; type: 'FILE' | 'FOLDER'; parentId?: string; content?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.fileNode.create({
      data: {
        name: data.name,
        type: data.type === 'FILE' ? FileNodeType.FILE : FileNodeType.FOLDER,
        projectId,
        parentId: data.parentId,
        content: data.content || (data.type === 'FILE' ? '' : null),
      },
    });
  }
}
