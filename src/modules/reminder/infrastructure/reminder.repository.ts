import { Agenda, PrismaClient, Reminder } from "@prisma/client";
import { createAgenda, createReminder } from "../domain/reminder.interface.js";
import { CronRepository } from "../../../services/cron-jobs/cron.repository.js";

export class ReminderRepository{
    private db:PrismaClient;

    constructor(){
        this.db = new PrismaClient
    }

    async restoreReminders(company_id:number, cb:(channel_id:string, message:string)=>void){
        const reminders = await this.getReminders({company_id});
        if(!reminders.length) return;

        reminders.forEach(async ({id, date, message, channel_id})=>{
            const day = date.getDate(),
            hour = date.getHours(),
            minute = date.getMinutes(),
            month = date.getMonth() + 1;
            CronRepository.createCronJob(`0 ${minute} ${hour} ${day} ${month} *`, ()=>{
                console.log("enviando mensaje");
                this.deleteReminder(id);
                cb(channel_id, message);
            });
        });
        CronRepository.restoreCronJobs();
    }

    async createReminder(reminder_data:createReminder, cb:()=>void):Promise<Reminder>{
        const reminder = await this.db.reminder.create({data: reminder_data}),
        month = reminder_data.date.getMonth() + 1,
        day = reminder_data.date.getDate(),
        hour = reminder_data.date.getHours(),
        minute = reminder_data.date.getMinutes();
        const cronExpression = `0 ${minute} ${hour} ${day} ${month} *`;
        CronRepository.createCronJob(cronExpression, ()=>{
            cb();
            this.deleteReminder(reminder.id);
        });
        return reminder;
    }

    async getReminders(where:{[key:string]: any}):Promise<Reminder[]>{
        return await this.db.reminder.findMany({where});
    }

    async deleteReminder(reminder_id:number){
        return await this.db.reminder.delete({where: {id: reminder_id}});
    }

    async createAgenda(agenda:createAgenda):Promise<Agenda>{
        return this.db.agenda.create({data: agenda});
    }

    async getAgenda(where:{[key:string]: any}):Promise<Agenda[]>{
        return this.db.agenda.findMany({where});
    }
}