import { Module } from '@nestjs/common';
import { DocumentsGateway } from './documents.gateway';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AuthModule, PrismaModule],
  providers: [DocumentsGateway],
})
export class DocumentsModule {}
