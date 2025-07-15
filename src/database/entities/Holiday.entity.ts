import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
export class Holiday {

    @Column()
    name: string

    @PrimaryColumn()
    date: string

}