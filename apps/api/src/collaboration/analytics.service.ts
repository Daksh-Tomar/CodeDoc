import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkspaceStats(workspaceId: string) {
    const totalMembers = await this.prisma.workspaceMember.count({ where: { workspaceId } });
    const totalActivities = await this.prisma.activity.count({ where: { workspaceId } });
    const aiSummaries = await this.prisma.activity.count({ 
      where: { workspaceId, aiSummary: { not: null } } 
    });
    const totalProjects = await this.prisma.project.count({ where: { workspaceId } });
    
    // Total files across all projects in workspace
    const projects = await this.prisma.project.findMany({ 
      where: { workspaceId },
      select: { id: true }
    });
    
    let totalFiles = 0; // Not querying DB anymore since files are on physical disk

    return {
      activeUsers: totalMembers,
      totalFiles,
      totalActivities,
      aiUsageCount: aiSummaries,
      totalProjects
    };
  }
}
