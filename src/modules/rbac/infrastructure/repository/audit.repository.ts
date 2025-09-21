import { PrismaClient } from "@prisma/client";

export class AuditRepository {
    constructor(private db: PrismaClient) {}

    async findAuditLogs(search: any): Promise<{ logs: any[], total: number }>{
        const where: any = {};
        if (search.user_id) where.user_id = search.user_id;
        if (search.action) where.action = { equals: search.action };
        if (search.date_from || search.date_to){
            where.timestamp = {};
            if (search.date_from) where.timestamp.gte = new Date(search.date_from);
            if (search.date_to) where.timestamp.lte = new Date(search.date_to);
        }

        const sortBy = search.sortBy ?? 'timestamp';
        const sortDir = search.sortDir ?? 'desc';

        const [logs, total] = await this.db.$transaction([
            this.db.auditLog.findMany({
                where,
                include: { user: { select: { id: true, name: true, email: true } } },
                skip: search.offset ?? 0,
                take: search.limit ?? 20,
                orderBy: { [sortBy]: sortDir }
            }),
            this.db.auditLog.count({ where })
        ]);

        const mapped = (logs as any[]).map((l: any) => ({
            id: l.id,
            timestamp: l.timestamp,
            user: l.user,
            action: l.action
        }));

        return { logs: mapped, total };
    }

    async findAuditLogsByRole(roleId: number, search: any){
        return this.findAuditLogs(search);
    }

    async findAuditLogsByUser(userId: number, search: any){
        return this.findAuditLogs({ ...search, user_id: userId });
    }
}