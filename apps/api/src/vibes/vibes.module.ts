import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { resolveJwtSecret } from "../common/config/jwt-secret";
import { VibesGateway } from "./vibes.gateway";
import { VibesService } from "./vibes.service";

@Module({
  imports: [
    JwtModule.register({
      secret: resolveJwtSecret(),
    }),
  ],
  controllers: [VibesGateway],
  providers: [VibesService],
  exports: [VibesService],
})
export class VibesModule {}
