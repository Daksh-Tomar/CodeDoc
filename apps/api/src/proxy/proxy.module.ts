import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ProxyMiddleware } from './proxy.middleware';
import { TerminalModule } from '../terminal/terminal.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TerminalModule, AuthModule, PrismaModule],
})
export class ProxyModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ProxyMiddleware)
      .forRoutes({ path: 'proxy/*', method: RequestMethod.ALL });
  }
}
