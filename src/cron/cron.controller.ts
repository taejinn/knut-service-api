import { Controller } from '@nestjs/common';
import {CronService} from "./cron.service";
import {Cron} from "@nestjs/schedule";

@Controller('cron')
export class CronController {

    constructor(private readonly cronService: CronService) {}

    @Cron('0 0,12 * * * ')
    async updateHoliday() {
        await this.cronService.updateHoliday();
    }

    @Cron('*/3 * * * * *') // 매 3초마다 실행됨
    async updateChungjuBusInfo() {

        // 주말인지 확인
        let dayOfWeek = new Date().getDay()
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return
        }

        // 공휴일인지 확인
        let date = new Date();
        let formattedYear = date.getFullYear();
        let formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        let formattedDay = String(date.getDate()).padStart(2, '0');
        let isHoliday = await this.cronService.isHoliday(`${formattedYear}${formattedMonth}${formattedDay}`);
        if (isHoliday) {
            return
        }

        // 버스가 운행하지 않는 시간인지 확인
        let hour = new Date().getHours();
        if (hour <= 6 || hour >= 22) { // 오전 7시 ~ 오후 10시
            console.log('[!] updateChungjuBusInfo() - 버스 미운행 시간')
            return
        }


        console.log('[!] updateChungjuBusInfo() - 버스 운행 시간 - 업데이트 진행')
        let busId = [
            "CHB272000673",
            "CHB272000674",
            "CHB272000675",
            "CHB272000741",
            "CHB272000378",
            "CHB272000379",
            "CHB272000381",
            "CHB272000382"
        ];
        await Promise.all(
            busId.map(_busId => this.cronService.updateBusInfo("33020", _busId))
        );
    }

    @Cron('*/2 * * * * *')
    async updateChungjuBusStatus() {
        // busTimeTable에 있는 departureTime을 모두 가져와서 현재 시간과 비교하여 출발 10분전~1분전까지 노선에 대하여 운행 준비 상태 저장
        let busId = [
            "CHB272000673",
            "CHB272000674",
            "CHB272000675",
            "CHB272000741",
            "CHB272000378",
            "CHB272000379",
            "CHB272000381",
            "CHB272000382"
        ];
        await this.cronService.updateChungjuBusInfoWithList(busId)
    }
}