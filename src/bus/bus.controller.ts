import {Controller, Get, Param, Version} from '@nestjs/common';
import {BusService} from "./bus.service";

@Controller('bus')
export class BusController {
    constructor(private readonly busService: BusService) {}

    @Version('1')
    @Get('/chungju/live/all')
    async getChungju() {
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

        let res = await this.busService.getBusInfo(busId)

        return {
            code: 'PROCESSING_COMPLETED',
            data: res
        }
    }
}
