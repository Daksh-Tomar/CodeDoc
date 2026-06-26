import { Controller, Get, Param } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('workspaces/:workspaceId/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async getActivities(@Param('workspaceId') workspaceId: string) {
    return this.activityService.getWorkspaceTimeline(workspaceId);
  }
}

@Controller('projects/:projectId/activities')
export class ProjectActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  async getProjectActivities(@Param('projectId') projectId: string) {
    return this.activityService.getProjectTimeline(projectId);
  }
}
