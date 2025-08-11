import { 
  LeadDetailDTO,
  LeadSummaryDTO,
  UpdateLeadInterface, 
  CreateLeadInterface, 
  LeadSearchInterface
} from "./leads.interface.js";
import { Lead } from "@prisma/client";
export interface LeadsRepositoryInterface {
  // Operaciones CRUD básicas
  createLead(lead: CreateLeadInterface): Promise<Lead>;
  createLeadsBatch(leads: CreateLeadInterface[]): Promise<Lead[]>;
  getLeadById(id: number): Promise<Lead | null>;
  getLeadsSummary(searchCriteria?: LeadSearchInterface): Promise<{leads: LeadSummaryDTO[], total: number}>;
  getLeadsDetail(searchCriteria?: LeadSearchInterface): Promise<{leads: LeadDetailDTO[], total: number}>;
  updateLead(lead: UpdateLeadInterface): Promise<Lead>;
  deleteLead(id: number): Promise<boolean>;
  
  // Operaciones relacionales modelo Company
  linkLeadToCompany(leadId: number, companyId: number): Promise<void>;
  linkLeadsToCompany(leadIds: number[], companyId: number): Promise<void>;
  
  // Operaciones de deduplicación
  checkDuplicateLead(phone: string, email?: string, excludeId?: number): Promise<boolean>;
} 