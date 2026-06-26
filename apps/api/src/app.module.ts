import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { AiModule } from './ai/ai.module';
import { TerminalModule } from './terminal/terminal.module';
import { CollaborationModule } from './collaboration/collaboration.module';

@Module({
  imports: [PrismaModule, AuthModule, DocumentsModule, AiModule, TerminalModule, CollaborationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
