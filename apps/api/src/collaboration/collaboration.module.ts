import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController, ProjectActivityController } from './activity.controller';
import { CommentService } from './comment.service';
import { NotificationGateway } from './notification.gateway';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ActivityController, ProjectActivityController],
  providers: [ActivityService, CommentService, NotificationGateway, AnalyticsService],
})
export class CollaborationModule {}
