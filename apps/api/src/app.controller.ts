import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get("health")
  getHealth(): { status: string; message: string } {
    return {
      status: "ok",
      message: this.appService.getHello(),
    };
  }

  @Get("time")
  getTime(): { serverNow: string; timeZone: string } {
    return {
      serverNow: new Date().toISOString(),
      timeZone: process.env.APP_TIMEZONE || "Asia/Dubai",
    };
  }

  @Get("health/deep")
  async getDeepHealth(): Promise<{
    status: string;
    message: string;
    database: string;
    serverNow: string;
    timeZone: string;
  }> {
    const serverNow = new Date().toISOString();
    const timeZone = process.env.APP_TIMEZONE || "Asia/Dubai";

    try {
      await this.prismaService.$queryRawUnsafe("SELECT 1");
      return {
        status: "ok",
        message: this.appService.getHello(),
        database: "ok",
        serverNow,
        timeZone,
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: "error",
        message: "Database connectivity check failed",
        database: "error",
        serverNow,
        timeZone,
      });
    }
  }
}
