import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { AppConfig } from '../config/configuration';
import { UsersModule } from '../users/users.module';

type ExpiresIn = NonNullable<JwtModuleOptions['signOptions']>['expiresIn'];
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<AppConfig, true>,
      ): JwtModuleOptions => {
        const expiresIn: string = config.get('jwt.expiresIn', { infer: true });
        return {
          secret: config.get('jwt.secret', { infer: true }),
          signOptions: {
            // Angka murni = detik. String seperti "15m"/"7d" diteruskan apa adanya.
            expiresIn: /^\d+$/.test(expiresIn)
              ? Number(expiresIn)
              : (expiresIn as ExpiresIn),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Urutan penting: autentikasi dulu, baru otorisasi role.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
