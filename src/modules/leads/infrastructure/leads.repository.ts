import { 
  LeadDetailDTO,
  LeadSummaryDTO,
  CreateLeadInterface, 
  UpdateLeadInterface, 
  LeadSearchInterface
} from "../domain/leads.interface.js";
import { PrismaClient, Lead } from "@prisma/client";
import { LeadsRepositoryInterface } from "../domain/repository.interface.js";
import { normalizeInternationalPhone } from "../../../shared/utils/utils.shared.js";

export class LeadsRepository implements LeadsRepositoryInterface {
  private db: PrismaClient;

  constructor() {
    this.db = new PrismaClient();
  }

  async createLead(lead: CreateLeadInterface): Promise<Lead> {
    try {
      return await this.db.lead.create({ data: lead as any });
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  async createLeadsBatch(leads: CreateLeadInterface[]): Promise<Lead[]> {
    try {
      if (!leads.length) return [];
      
      // Usar createMany para inserción masiva
      await this.db.lead.createMany({ 
        data: leads,
        skipDuplicates: true // Evitar errores por duplicados
      });

      // Obtener los leads creados para retornarlos
      const createdLeads = await this.db.lead.findMany({
        where: {
          OR: leads.map(lead => ({
            phone: lead.phone,
            email: lead.email
          })).filter(condition => condition.phone || condition.email)
        },
        orderBy: { id: 'desc' },
        take: leads.length
      });

      return createdLeads;
    } catch (error) {
      console.error('Error creating leads batch:', error);
      throw error;
    }
  }

  async getLeadById(id: number): Promise<Lead | null> {
    try {
      return await this.db.lead.findUnique({
         where: { id },
         include: {
           lead_relationships: {
            include: {
              company: true
            }
          },
          reminders: true
        }
      });
    } catch (error) {
      console.error('Error getting lead by id:', error);
      throw error;
    }
  }

  async getLeadsSummary(searchCriteria?: LeadSearchInterface): Promise<{leads: LeadSummaryDTO[], total: number}> {
    try {
      const { where, skip, take } = this.buildQueryParams(searchCriteria);
      const [leads, total] = await Promise.all([
        this.db.lead.findMany({
          skip,
          take,
          where,
          select: {
            id: true,
            name: true,
            city: true,
            industry: true,
            lead_score: true,
            status: true,
            pipeline_stage: true,
            source: true,
          },
          orderBy: { id: 'desc' }
        }) as unknown as Promise<LeadSummaryDTO[]>,
        this.db.lead.count({ where })
      ]);
      return { leads, total };
    } catch (error) {
      console.error('Error getting leads summary:', error);
      throw error;
    }
  }

  async getLeadsDetail(searchCriteria?: LeadSearchInterface): Promise<{leads: LeadDetailDTO[], total: number}> {
    try {
      const { where, skip, take } = this.buildQueryParams(searchCriteria);
      const [leads, total] = await Promise.all([
        this.db.lead.findMany({
          skip,
          take,
          where,
          include: {
            lead_relationships: {
              include: {  
                company: true
              }
            },
            reminders: true
          },
          orderBy: { id: 'desc' }
        }) as unknown as Promise<LeadDetailDTO[]>,
        this.db.lead.count({ where })
      ]);

      return { leads, total };
    } catch (error) {
      console.error('Error getting leads detail:', error);
      throw error;
    }
  }

  private buildQueryParams(searchCriteria?: LeadSearchInterface): { where: any; skip?: number; take?: number } {
    const where: any = {};
    let take: number | undefined;
    let skip: number | undefined;

    if (searchCriteria) {
      const {
        city,
        limit,
        status,
        offset,
        source,
        industry,
        lead_score_min,
        lead_score_max,
        pipeline_stage,
      } = searchCriteria;

      Object.assign(where, {
        ...((lead_score_min != null || lead_score_max != null) && {
          lead_score: {
            ...(lead_score_min != null && { gte: Number(lead_score_min) }),
            ...(lead_score_max != null && { lte: Number(lead_score_max) })
          }
        }),
        ...(status != null && { status }),
        ...(source != null && { source }),
        ...(pipeline_stage != null && { pipeline_stage }),
        ...(city != null && { city: { contains: city, mode: 'insensitive' } }),
        ...(industry != null && { industry: { contains: industry, mode: 'insensitive' } })
      });

      take = limit ? Number(limit) : undefined; 
      skip = offset ? Number(offset) : undefined;
    }

    return { where, skip, take };
  }

  async updateLead(lead: UpdateLeadInterface): Promise<Lead> {
    try {
      const { id, ...updateData } = lead;
      return await this.db.lead.update({ where: { id }, data: updateData });
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  async deleteLead(id: number): Promise<boolean> {
    try {
      await this.db.lead.delete({ where: { id } });
      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  }

  async linkLeadToCompany(leadId: number, companyId: number): Promise<void> {
    try {
      await this.db.companyLeads.create({
        data: {
          companyId: companyId,
          leadId: leadId
        }
      });
    } catch (error) {
      console.error('Error linking lead to company:', error);
      throw error;
    }
  }

  async linkLeadsToCompany(leadIds: number[], companyId: number): Promise<void> {
    try {
      if (!leadIds.length) return;

      // Crear múltiples relaciones en una sola operación
      const relations = leadIds.map(leadId => ({
        companyId: companyId,
        leadId: leadId
      }));

      await this.db.companyLeads.createMany({
        data: relations,
        skipDuplicates: true // Evitar duplicados
      });
    } catch (error) {
      console.error('Error linking leads to company:', error);
      throw error;
    }
  }

  async checkDuplicateLead(phone: string, email?: string): Promise<Lead | null> {
    try {
      const normalizedPhone = normalizeInternationalPhone(phone) || phone;
      const where: any = {
        OR: [
          { phone: normalizedPhone },
          ...(email ? [{ email }] : [])
        ]
      };

      return await this.db.lead.findFirst({ where });
    } catch (error) {
      console.error('Error checking duplicate lead:', error);
      throw error;
    }
  }

  async mergeDuplicateLeads(primaryLeadId: number, duplicateLeadIds: number[]): Promise<Lead> {
    try {
      // Obtener el lead principal
      const primaryLead = await this.getLeadById(primaryLeadId);
      if (!primaryLead) {
        throw new Error('Lead principal no encontrado');
      }

      // Mover todos los logs de comunicación y relaciones de los leads duplicados al principal
      for (const duplicateId of duplicateLeadIds) {
        // Mover logs de comunicación (MessageLog) a la nueva referencia
        await (this.db as any).messageLog.updateMany({
          where: { entityType: 'Lead', entityId: duplicateId },
          data: { entityId: primaryLeadId }
        } as any);

        // Mover relaciones con empresas
        await this.db.companyLeads.updateMany({
          where: { leadId: duplicateId },
          data: { leadId: primaryLeadId }
        } as any);

        // Eliminar el lead duplicado
        await this.db.lead.delete({
          where: { id: duplicateId }
        });
      }

      return await this.getLeadById(primaryLeadId) as Lead;
    } catch (error) {
      console.error('Error merging duplicate leads:', error);
      throw error;
    }
  }
}