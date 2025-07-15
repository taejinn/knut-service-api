import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class BusTimeTable {

    @PrimaryGeneratedColumn()
    id: number

    @Column()
    busId: string

    @Column()
    startNode: string

    @Column()
    departureTime: string

    @Column()
    endNode: string

}