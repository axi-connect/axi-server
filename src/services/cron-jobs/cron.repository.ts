import cron from 'node-cron';
import { ScheduledTask } from 'node-cron';

export class CronRepository {
    static createCronJob(cronExpression: string, callback: () => void) {
        cron.schedule(cronExpression, callback);
    }

    static restoreCronJobs() {
        const cronJobs = cron.getTasks();
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

        cronJobs.forEach((job:any)=>{
            const [second, minute, hour, day, month, dayOfWeek] = job._scheduler.timeMatcher.expressions;
            console.log(`reminder: ⌛ ${hour}:${minute}:${second} - 📆 ${day}/${month}|${months[Number(month) - 1]} - day:${dayOfWeek}`);
        });
    }
}

