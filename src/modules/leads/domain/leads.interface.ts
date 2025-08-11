import { JsonValue } from '../../../types/json.js';
import { Prisma, LeadStatus } from "@prisma/client";

// Interface base reutilizable
type BaseLeadInput = Prisma.LeadCreateInput;

// Relación enriquecida con Prisma
export type LeadWithRelations = Prisma.LeadGetPayload<{
  include: {
    lead_relationships: true;
    reminders: true;
  };
}>;

// 🎯 Crear lead: obligatorio `phone` y `source`
type RequiredCreateFields = 'phone' | 'source';
export type CreateLeadInterface = Required<Pick<BaseLeadInput, RequiredCreateFields>> & Omit<BaseLeadInput, RequiredCreateFields>;

// 🎯 Actualizar lead: obligatorio `id`, el resto opcional
export interface UpdateLeadInterface extends Partial<BaseLeadInput> {
  id: number;
}

// 🎯 Búsqueda de leads internos en base de datos
export interface LeadSearchInterface {
  company_id?: number;
  status?: LeadStatus;
  industry?: string;
  city?: string;
  source?: string;
  lead_score_min?: number;
  lead_score_max?: number;
  pipeline_stage?: string;
  limit?: number;
  offset?: number;
  view?: ViewMode;
}

// 🎯 Búsqueda en Google Maps API
export interface GoogleMapsSearchInterface {
  location: string; // Dirección o coordenadas
  radius?: number; // Radio en metros
  type?: string; // Tipo de negocio
  keyword?: string; // Palabra clave
  maxResults?: number; // Máximo número de resultados
}

// 🎯 Resultado detallado de Google Maps Place Details
export interface GoogleMapsPlaceInterface {
  url: string,
  place_id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: JsonValue[];
  opening_hours?: JsonValue;
  photos?: string[];
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types?: string[];
  business_status?: string;
}

// 🎯 Datos enriquecidos de un lead
export interface LeadEnrichmentInterface {
  lead_id: number;
  enriched_data: {
    company_info?: JsonValue;
    social_media?: JsonValue;
    financial_data?: JsonValue;
    contact_verification?: JsonValue;
  };
}

/* Enums */
// 🎯 Fuentes de origen del lead
export enum LeadSource {
  GOOGLE_MAPS = "Google Maps",
  MANUAL = "Manual",
  WEB_FORM = "Formulario Web",
  REFERRAL = "Referido",
  SOCIAL_MEDIA = "Redes Sociales",
  EMAIL_CAMPAIGN = "Campaña de Email"
}

// 🎯 Etapas del embudo comercial
export enum PipelineStage {
  INITIAL_CONTACT = "Initial Contact",
  QUALIFIED = "Qualified",
  PROPOSAL = "Proposal",
  NEGOTIATION = "Negotiation",
  CLOSED_WON = "Closed Won",
  CLOSED_LOST = "Closed Lost"
} 

export interface LeadSummaryDTO {
  id: number;
  name?: string | null;
  city?: string | null;
  industry?: string | null;
  lead_score: number;
  status: LeadStatus;
  pipeline_stage: string;
  source: string;
}

// Proyección/DTOs
export type ViewMode = 'summary' | 'detail';

// Para detalle usamos el tipo enriquecido existente
export type LeadDetailDTO = LeadWithRelations;