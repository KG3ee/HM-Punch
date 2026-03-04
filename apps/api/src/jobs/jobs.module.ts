import { Module } from "@nestjs/common";
import { DeductionsModule } from "../deductions/deductions.module";
import { ReportsModule } from "../reports/reports.module";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";

@Module({
  imports: [ReportsModule, DeductionsModule],
  controllers: [JobsController],
  providers: [JobsService],
})
export class JobsModule {}
