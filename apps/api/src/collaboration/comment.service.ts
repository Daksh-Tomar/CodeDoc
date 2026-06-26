import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createThread(fileNodeId: string, userId: string, lineNumber: number, content: string) {
    const thread = await this.prisma.commentThread.create({
      data: {
        fileNodeId,
        lineNumber,
        comments: {
          create: {
            userId,
            content
          }
        }
      },
      include: { comments: { include: { user: { select: { name: true } } } } }
    });
    this.logger.log(`Thread created on file ${fileNodeId} line ${lineNumber}`);
    return thread;
  }

  async addReply(threadId: string, userId: string, content: string) {
    return this.prisma.comment.create({
      data: {
        threadId,
        userId,
        content
      },
      include: { user: { select: { name: true } } }
    });
  }

  async resolveThread(threadId: string) {
    return this.prisma.commentThread.update({
      where: { id: threadId },
      data: { resolved: true }
    });
  }

  async getThreadsForFile(fileNodeId: string) {
    return this.prisma.commentThread.findMany({
      where: { fileNodeId },
      include: {
        comments: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { lineNumber: 'asc' }
    });
  }
}
