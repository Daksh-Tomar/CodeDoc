import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  /**
   * Logs a new activity. If diffText is provided, automatically generates an AI summary.
   */
  async logActivity(
    workspaceId: string,
    userId: string,
    type: ActivityType,
    description: string,
    fileNodeId?: string,
    diffText?: string
  ) {
    let aiSummary: string | undefined = undefined;

    if (diffText) {
      aiSummary = await this.aiService.generateSummary(diffText);
    }

    const activity = await this.prisma.activity.create({
      data: {
        workspaceId,
        userId,
        type,
        description,
        fileNodeId,
        aiSummary
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fileNode: { select: { id: true, name: true } }
      }
    });

    this.logger.log(`Activity logged [${type}] in workspace ${workspaceId} by user ${userId}`);
    return activity;
  }

  async getWorkspaceTimeline(workspaceId: string) {
    return this.prisma.activity.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        fileNode: { select: { id: true, name: true } }
      }
    });
  }
}
