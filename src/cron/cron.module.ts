import { Module } from '@nestjs/common';
import {TypeOrmModule} from "@nestjs/typeorm";
import {Bus} from "../database/entities/Bus.entity";
import {CronController} from "./cron.controller";
import {CronService} from "./cron.service";
import {BusTimeTable} from "../database/entities/BusTimeTable.entity";
import {Holiday} from "../database/entities/Holiday.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Bus, Holiday, BusTimeTable])],
    controllers: [CronController],
    providers: [CronService],
})
export class CronModule {}
