import { Module } from '@nestjs/common';
import { DocumentsGateway } from './documents.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuthModule, PrismaModule, AiModule],
  providers: [DocumentsGateway],
})
export class DocumentsModule {}
