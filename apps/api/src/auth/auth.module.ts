import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WsJwtGuard } from './ws-jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-codedoc', // Replace with proper env config
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [WsJwtGuard],
  exports: [WsJwtGuard, JwtModule],
})
export class AuthModule {}
