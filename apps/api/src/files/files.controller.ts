import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { FilesService } from './files.service';

@Controller('projects/:projectId/files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get()
  getProjectFiles(@Param('projectId') projectId: string) {
    return this.filesService.getProjectFiles(projectId);
  }

  @Get(':fileId')
  getFile(@Param('projectId') projectId: string, @Param('fileId') fileId: string) {
    // projectId is in the path, but we can also just fetch by fileId.
    // Wait, the path is /projects/:projectId/files. So this is /projects/:projectId/files/:fileId
    return this.filesService.getFile(fileId);
  }

  @Post()
  createFile(
    @Param('projectId') projectId: string,
    @Body() data: { name: string; type: 'FILE' | 'FOLDER'; parentId?: string; content?: string },
  ) {
    return this.filesService.createFile(projectId, data);
  }
}
