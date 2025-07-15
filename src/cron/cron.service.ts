import {Injectable} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import {Bus} from "../database/entities/Bus.entity";
import {In, Repository} from "typeorm";
import axios from "axios";
import {Holiday} from "../database/entities/Holiday.entity";
import * as moment from 'moment-timezone';
import 'moment-timezone';
import {BusTimeTable} from "../database/entities/BusTimeTable.entity";

@Injectable()
export class CronService {
    constructor(
        @InjectRepository(Bus)
        private readonly busRepository: Repository<Bus>,
        @InjectRepository(Holiday)
        private readonly holidayRepository: Repository<Holiday>,
        @InjectRepository(BusTimeTable)
        private readonly busTimeTableRepository: Repository<BusTimeTable>,
    ) {
    }

    async isWeekend() {
        let dayOfWeek = new Date().getDay()
        return dayOfWeek === 0 || dayOfWeek === 6;
    }

    async updateChungjuBusInfoWithList(routeId: string[]) {
        let checkDayOff = await this.todayIsDayOff();

        if (checkDayOff) {
            await this.busRepository.update({
                busId: In(routeId),
            }, {
                status: 'END'
            })
            return 'END'
        }

        let now = moment().tz("Asia/Seoul").format('HH:mm')
        let nowHour = now.split(':')[0];
        let nowMinute = now.split(':')[1];

        // 같은 버스 ID에 여러개의 시간표가 존재함.
        let findBusTimetableWithInfo = await this.busTimeTableRepository
            .createQueryBuilder("btt")
            .leftJoinAndMapOne('btt.info', Bus, 'bus', 'btt.busId = bus.busId')
            .where('btt.busId IN (:...ids)', { ids: routeId })
            .getMany();

        // 그 시간표 중 출발 10분~1분 전일 경우, 운행 대기(wait)으로 변경
        let changeStatusToWait: string[] = []
        let changeStatusToWaitTime = {}
        let changeStatusToWaitData: string[] = []
        let statusIsEnd: string[] = []
        let changeStatusToRunningDataNotReceived: string[] = []
        findBusTimetableWithInfo.map(async (data, key) => {

            let [busRunningTimeHours, busRunningTimeMinutes] = (data.departureTime).split(':').map(Number)
            let busDate = new Date()
            busDate.setHours(busRunningTimeHours, busRunningTimeMinutes, 0, 0);

            let now = moment().tz("Asia/Seoul").format('HH:mm')
            let [nowTimeHours, nowTimeMinutes] = now.split(':').map(Number)
            let nowDate = new Date()
            nowDate.setHours(nowTimeHours, nowTimeMinutes, 0, 0);

            // 버스 출발시간 - 현재 시간
            let calcTime = (busDate.getTime() - nowDate.getTime()) / (1000 * 60);

            // 시간표상 출발 1~10분 전
            if (calcTime <= 10 && calcTime >= 1 ) {
                if (data['info'].status != 'RUNNING') {
                    changeStatusToWait.push(data.busId)
                    changeStatusToWaitTime[data.busId] = data.departureTime
                }
            }

            console.log(`[busId] ${data.busId} | [calcTime] ${calcTime} | [startTime] ${data.departureTime}`)

            // 시간표상 출발 후, 데이터 수신 대기로 변경
            if (calcTime >= 0 && calcTime < 1) {
                if (data['info'].status == 'WAIT') {
                    changeStatusToWaitData.push(data.busId)
                }
            }

            // 출발 후 7분이 지나도 WAIT_DATA 상태일 경우,
            // 공공데이터포털측에서 데이터가 안넘어오는 상태임.
            // 도로 정체로 인해 시간표가 밀리는 경우 발생하기도 함.
            if (calcTime < -7 && calcTime > -20) {
                if (data['info'].status == 'WAIT_DATA') {
                    // RUNNING_DATA_NOT_RECEIVED
                    changeStatusToRunningDataNotReceived.push(data.busId)
                }
            }

            if (calcTime <= -20) {
                if (data['info'].status == 'RUNNING_DATA_NOT_RECEIVED') {
                    // 출발 10분 후 까지 데이터가 안넘어오고
                    // RUNNING_DATA_NOT_RECEIVED로 status가 변경되고 10분이 지난 뒤에
                    // END로 변경.
                    statusIsEnd.push(data.busId)
                }
            }

            // END인 버스는 사용하지 않는 정보 제거
            if (data['info'].status == 'END') {
                // 단, 위에 상태 변경 예정인건 제외
                if (!changeStatusToWait.includes(data.busId)) {
                    if (!changeStatusToWaitData.includes(data.busId)) {
                        statusIsEnd.push(data.busId)
                    }
                }
            }
        })
        let _now = moment().tz("Asia/Seoul").format('HH:mm:ss')
        console.log('----------')
        console.log('[!] updateChungjuBusInfoWithList() - 정보')
        console.log(_now)
        console.log('[statusIsEnd] => ' + statusIsEnd)
        console.log('[changeStatusToWait] => ' + changeStatusToWait)
        console.log('[changeStatusToWaitData] => ' + changeStatusToWaitData)
        console.log('[changeStatusToRunningDataNotReceived] => ' + changeStatusToRunningDataNotReceived)
        console.log('----------')

        await this.busRepository.update({
            busId: In(statusIsEnd)
        }, {
            startRunningTime: null,
            busStopName: null,
            busStopNo: null,
            vehicleId: null,
        })

        for (let i=0;i<changeStatusToWait.length;i++) {
            await this.busRepository.update({
                busId: changeStatusToWait[i],
            }, {
                status: 'WAIT',
                startRunningTime: changeStatusToWaitTime[changeStatusToWait[i]]
            })
        }

        await this.busRepository.update({
            busId: In(changeStatusToWaitData)
        }, {
            status: 'WAIT_DATA'
        })

        await this.busRepository.update({
            busId: In(changeStatusToRunningDataNotReceived)
        }, {
            status: 'RUNNING_DATA_NOT_RECEIVED'
        })
    }

    async todayIsDayOff() {
        let checkWeekend = await this.isWeekend()
        if (checkWeekend) {
            return true
        }
        let date = new Date();
        let formattedYear = date.getFullYear();
        let formattedMonth = String(date.getMonth() + 1).padStart(2, '0');
        let formattedDay = String(date.getDate()).padStart(2, '0');
        return await this.isHoliday(`${formattedYear}${formattedMonth}${formattedDay}`);
    }

    async getBusInfo(cityCode: string, routeId: string) {
        return axios({
            method: 'GET',
            url: 'https://apis.data.go.kr/1613000/BusLcInfoInqireService/getRouteAcctoBusLcList',
            params: {
                serviceKey: process.env["API_KEY"],
                pageNo: 1,
                numOfRows: 100,
                _type: 'json',
                cityCode: cityCode,
                routeId: routeId,
            }
        });
    }

    async updateBusInfo(cityCode: string, routeId: string) {

        // 운행시간 이전이면 return
        // 입력된 버스 ID에 대하여 시간표에 적힌 시간표보다 10분이상 더 이를경우엔 return

        let checkStatus = await this.busRepository.findOne({
            where: {
                busId: routeId,
            },
            select: {
                status: true
            }
        })

        // status가 WAIT, WAIT_DATA, RUNNING 인 것만 업데이트 할 수 있도록 제한.
        // status는 이 함수가 아니라 다른 함수에서 값을 설정함.

        // if (checkStatus.status == 'END') {
        //     return
        // }
        // 위 코드때문에 END로 계속 바뀌는건가?

        // WAIT으로 바뀌기전에 RUNNING으로 바뀌어버리면?
        // WAIT으로 바꾸는건 위 버스 시간 계산하는 함수에서 하는데.
        // 이미 RUNNING인건 제외해야하나?

        let busInfo = await this.getBusInfo(cityCode, routeId);
        // 공공데이터포털 api 호출 횟수를 줄이기 위해서 위 busInfo는 상태가 END일 경우엔 무시.

        if (busInfo.data.response.body.totalCount == 0 && checkStatus.status != 'WAIT' && checkStatus.status != 'WAIT_DATA' && checkStatus.status != 'RUNNING_DATA_NOT_RECEIVED') {
            await this.busRepository.update(
                {busId: routeId},
                {
                    lat: null,
                    lng: null,
                    vehicleId: null,
                    busStopNo: null,
                    busStopName: null,
                    startRunningTime: null,
                    updatedAt: new Date(),
                    status: 'END'
                }
            )
            return
        }

        if (checkStatus.status == 'WAIT') {
            return // WAIT_DATA에서만 데이터 반영할 것.
        }

        if (checkStatus.status == 'WAIT_DATA') {
            if (busInfo.data.response.body.totalCount == 0) {
                return
            }
        }

        await this.busRepository.update(
            {busId: routeId},
            {
                lat: busInfo.data.response.body.items.item?.gpslati,
                lng: busInfo.data.response.body.items.item?.gpslong,
                vehicleId: busInfo.data.response.body.items.item?.vehicleno,
                busStopName: busInfo.data.response.body.items.item?.nodenm,
                busStopNo: busInfo.data.response.body.items.item?.nodeord,
                updatedAt: new Date(),
                status: 'RUNNING'
            }
        )
        return
    }

    async updateHoliday() {

        let getHolidays = await axios({
            method: 'GET',
            url: 'https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo',
            params: {
                serviceKey: process.env["API_KEY"],
                numOfRows: 100,
                solYear: new Date().getFullYear(),
                _type: "json"
            }
        });
        await this.holidayRepository.clear();
        let holidays = getHolidays.data.response.body.items.item;
        holidays.map((data, key) => {
            holidays[key] = {name: data.dateName, date: String(data.locdate)}
        })
        await this.holidayRepository.save(holidays)
        return;
    }

    async isHoliday(date: string) {
        let find = await this.holidayRepository.findOne({
            where: {
                date: date
            }
        })

        if (find) return true
        if (!find) return false
    }
}
