import { Module } from '@nestjs/common';
import { DocumentsGateway } from './documents.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [AuthModule, PrismaModule, AiModule, WorkspaceModule],
  providers: [DocumentsGateway],
})
export class DocumentsModule {}
