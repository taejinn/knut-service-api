import {Injectable} from '@nestjs/common';
import {Bus} from "../database/entities/Bus.entity";
import {InjectRepository} from "@nestjs/typeorm";
import {Repository, In} from "typeorm";

@Injectable()
export class BusService {
    constructor(
        @InjectRepository(Bus)
        private readonly busRepository: Repository<Bus>,
    ) {
    }

    async getBusInfo(busId: string[]) {
        return await this.busRepository.find({
            where: {
                busId: In(busId)
            },
            select: {
                status: true,
                busId: true,
                lat: true,
                lng: true,
                vehicleId: true,
                busStopNo: true,
                busStopName: true,
                startNode: true,
                endNode: true,
                routeInfo: true,
                startRunningTime: true,
            },
            order: {
                id: "ASC",
            }
        })
    }

}