import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { resolveJwtSecret } from '../common/config/jwt-secret';
import { DeductionsController } from './deductions.controller';
import { DeductionsService } from './deductions.service';

@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [DeductionsController],
  providers: [DeductionsService],
  exports: [DeductionsService],
})
export class DeductionsModule {}
