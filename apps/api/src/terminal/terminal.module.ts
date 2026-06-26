import { Module } from '@nestjs/common';
import { ContainerManager } from './container.manager';
import { TerminalGateway } from './terminal.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspaceModule } from '../workspace/workspace.module';

@Module({
  imports: [PrismaModule, WorkspaceModule],
  providers: [ContainerManager, TerminalGateway],
  exports: [ContainerManager],
})
export class TerminalModule {}
