import { channel, days, periodicity } from "@prisma/client"

export interface createAgenda{
    company_id: number,
    client_id: number,
    date: Date,
    hour: string,
    product_id: number
}

export interface createReminder{
    date: Date,
    days?: days[],
    company_id: number,
    channel: channel,
    channel_id: string,
    client_id?: number,
    lead_id?: number|null,
    periodicity: periodicity,
    message: string,
}