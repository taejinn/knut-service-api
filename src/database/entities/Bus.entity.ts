import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Bus {

    @PrimaryGeneratedColumn()
    id: number

    @Column({ nullable: false })
    status: string

    @Column({nullable: true})
    lat: string

    @Column({nullable: true})
    lng: string

    @Column({nullable: false})
    busId: string

    @Column({nullable: true})
    vehicleId: string

    @Column({nullable: true})
    busStopNo: string

    @Column({nullable: true})
    busStopName: string

    @Column({nullable: true})
    startNode: string

    @Column({nullable: true})
    endNode: string

    @Column({nullable: true})
    routeInfo: string

    @Column({nullable: true})
    startRunningTime: string

    @UpdateDateColumn()
    updatedAt: Date

}