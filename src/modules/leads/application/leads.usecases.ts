import { 
  LeadSource,
  PipelineStage,
  LeadDetailDTO,
  LeadSummaryDTO,
  CreateLeadInterface, 
  UpdateLeadInterface, 
  LeadSearchInterface,
  GoogleMapsPlaceInterface,
  GoogleMapsSearchInterface,
} from "../domain/leads.interface.js";
import { Lead, LeadStatus } from "@prisma/client";
import { getCache, setCache } from "../../../shared/utils/cache.util.js";
import { LeadsRepositoryInterface } from "../domain/repository.interface.js";
import { GoogleMapsRepository } from "../../../services/google/maps.repository.js";
import { CloudinaryRepository } from "../../../services/cloudinary.repository.js";
import { normalizeInternationalPhone, normalizeTextValue } from "../../../shared/utils/utils.shared.js";
 
export interface GooglePhotoResult {
  secure_url: string;
  public_id: string;
  contentType: string;
}

export class LeadsUseCases {
  private googleMapsRepository: GoogleMapsRepository;
  private cloudinaryRepository: CloudinaryRepository;
  private static readonly GOOGLE_PHOTO_CACHE_PREFIX = 'gplaces:photo:';

  constructor(private leadsRepository: LeadsRepositoryInterface) {
    this.googleMapsRepository = new GoogleMapsRepository();
    this.cloudinaryRepository = new CloudinaryRepository();
  }

  /**
   * Crear un nuevo lead
  */
  async createLead(leadData: CreateLeadInterface): Promise<Lead> {
    try {
      // Asignar valores por defecto
      const leadWithDefaults: CreateLeadInterface = {
        ...leadData,
        source: leadData.source || LeadSource.MANUAL,
        status: leadData.status || LeadStatus.New,
        pipeline_stage: leadData.pipeline_stage || PipelineStage.INITIAL_CONTACT,
        lead_score: leadData.lead_score || 0
      };

      // Normalización de negocio
      const normalizedPhone = normalizeInternationalPhone(leadWithDefaults.phone) || leadWithDefaults.phone;

      // Regla de duplicidad (email / phone)
      const duplicate = await this.leadsRepository.checkDuplicateLead(normalizedPhone, leadWithDefaults.email!);
      if (duplicate) throw new Error('Ya existe un lead con el mismo teléfono o email');

      return await this.leadsRepository.createLead({
        ...leadWithDefaults,
        phone: normalizedPhone,
        city: normalizeTextValue(leadWithDefaults.city) ?? leadWithDefaults.city,
        industry: normalizeTextValue(leadWithDefaults.industry) ?? leadWithDefaults.industry
      });
    } catch (error) {
      console.error('Error in createLead use case:', error);
      throw error;
    }
  } 

  /**
   * Obtener leads con filtros opcionales
  */
  async getLeads(searchCriteria?: LeadSearchInterface): Promise<{leads: LeadSummaryDTO[] | LeadDetailDTO[], total: number}> {
    try {
      if (!searchCriteria) return await this.leadsRepository.getLeadsSummary(searchCriteria);

      const { city, industry, view, ...rest } = searchCriteria as LeadSearchInterface & { view?: 'summary' | 'detail' };
      const selectedView = view === 'detail' ? 'detail' : 'summary';
      const normalizedFilters: LeadSearchInterface = {
        ...rest,
        ...(typeof city !== 'undefined' ? { city: normalizeTextValue(city) ?? city } : {}),
        ...(typeof industry !== 'undefined' ? { industry: normalizeTextValue(industry) ?? industry } : {})
      };
      
      if (selectedView === 'detail') return await this.leadsRepository.getLeadsDetail(normalizedFilters);
      return await this.leadsRepository.getLeadsSummary(normalizedFilters);
    } catch (error) {
      console.error('Error in getLeads use case:', error);
      throw error;
    }
  }

  /**
   * Obtener un lead por ID
  */
  async getLeadById(id: number): Promise<Lead | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de lead inválido');
      }

      return await this.leadsRepository.getLeadById(id);
    } catch (error) {
      console.error('Error in getLeadById use case:', error);
      throw error;
    }
  }

  /**
   * Actualizar un lead
  */
  async updateLead(leadData: UpdateLeadInterface): Promise<Lead> {
    try {
      if (!leadData.id || leadData.id <= 0) {
        throw new Error('ID de lead inválido');
      }

      // Verificar que el lead existe
      const existingLead = await this.leadsRepository.getLeadById(leadData.id);
      if (!existingLead) throw new Error('Lead no encontrado');

      // Normalización de negocio
      const normalizedUpdate: UpdateLeadInterface = { 
        ...leadData,
        city: normalizeTextValue(leadData.city) ?? undefined,
        industry: normalizeTextValue(leadData.industry) ?? undefined,
        phone: normalizeInternationalPhone(leadData.phone) ?? undefined,
      };

      // Regla de duplicidad si cambia phone/email
      const phoneToCheck = normalizedUpdate.phone ?? existingLead.phone;
      const emailToCheck = normalizedUpdate.email ?? existingLead.email ?? undefined;
      if (
        (typeof normalizedUpdate.phone !== 'undefined' && phoneToCheck !== existingLead.phone) ||
        (typeof normalizedUpdate.email !== 'undefined' && emailToCheck !== existingLead.email)
      ) {
        const duplicate = await this.leadsRepository.checkDuplicateLead(phoneToCheck, emailToCheck);
        if (duplicate && duplicate.id !== normalizedUpdate.id) throw new Error('Ya existe un lead con el mismo teléfono o email');
      }

      return await this.leadsRepository.updateLead(normalizedUpdate);
    } catch (error) {
      console.error('Error in updateLead use case:', error);
      throw error;
    }
  }

  /**
   * Eliminar un lead
  */
  async deleteLead(id: number): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de lead inválido');
      }

      // Verificar que el lead existe
      const existingLead = await this.leadsRepository.getLeadById(id);
      if (!existingLead) {
        throw new Error('Lead no encontrado');
      }

      return await this.leadsRepository.deleteLead(id);
    } catch (error) {
      console.error('Error in deleteLead use case:', error);
      throw error;
    }
  }

  /**
   * Buscar lugares en Google Maps
  */
  async searchGoogleMapsPlaces(searchParams: GoogleMapsSearchInterface): Promise<GoogleMapsPlaceInterface[]> {
    try {
      if (!searchParams.location) throw new Error('Ubicación requerida');
      return await this.googleMapsRepository.searchPlaces(searchParams);
    } catch (error) {
      console.error('Error in searchGoogleMapsPlaces use case:', error);
      throw error;
    }
  }

  /**
   * Decodifica las rederencias de las fotos de Google Places
  */
  async getGooglePhoto(photoRef: string): Promise<GooglePhotoResult>{
    try {
      if (!photoRef) throw new Error('photoRef requerido');

      const cacheKey = `${LeadsUseCases.GOOGLE_PHOTO_CACHE_PREFIX}${photoRef}`;
      const cached = await getCache<{ secure_url: string; public_id: string; contentType?: string }>(cacheKey);

      // Si existe en caché (Cloudinary), retornar referencia directa
      if (cached?.secure_url) {
        return {
          secure_url: cached.secure_url,
          public_id: cached.public_id,
          contentType: cached.contentType || 'image/jpeg',
        };
      }

      // No existe en caché -> obtener de Google y subir a Cloudinary
      const googlePhoto = await this.googleMapsRepository.getPhoto(photoRef);

      const upload = await this.cloudinaryRepository.uploadFromBuffer(googlePhoto.data, { folder: 'google-places' });

      const ttlSeconds = this.getGooglePhotoCacheTtl();
      await setCache(cacheKey, { ...upload, contentType: googlePhoto.contentType }, ttlSeconds);

      return {
        secure_url: upload.secure_url,
        public_id: upload.public_id,
        contentType: googlePhoto.contentType,
      };
    } catch (error) {
      console.error('Error in searchGoogleMapsPlaces use case:', error);
      throw error;
    }
  }

  private getGooglePhotoCacheTtl(): number {
    const fallback = 60 * 60 * 24 * 365; // 365 días
    const envTtl = process.env.GOOGLE_PLACES_PHOTO_CACHE_TTL_SECONDS;
    const parsed = envTtl ? parseInt(envTtl, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /**
   * Guardar leads desde Google Maps en lote
  */
  async saveGoogleMapsLeadsBatch(
    placesData: GoogleMapsPlaceInterface[],
    companyId?: number
  ): Promise<Lead[]> {
    try {
      if (!placesData.length) throw new Error('Lista de lugares vacía');

      const leadsWithDefaults: CreateLeadInterface[] = placesData.map((place) => {
        if (!place.name) throw new Error('Nombre del lugar requerido');
        if (!place.phone && !place.website)
          throw new Error(`Se requiere al menos teléfono o sitio web para ${place.name}`);

          return {
            name: place.name,
            phone: normalizeInternationalPhone(place.phone || '') || (place.phone || ''),
            website: place.website || '',
            source: LeadSource.GOOGLE_MAPS,
            address: place.address || '',
            industry: (place.types || []).join(', ') || '',
            opening_hours: place.opening_hours || undefined,
            reviews: place.reviews || undefined,
            lead_score: place.rating ? Math.round(place.rating * 10) : 0,
            status: LeadStatus.New,
            pipeline_stage: PipelineStage.INITIAL_CONTACT
          };
      });

      // Inserción masiva en la BD
      const leads = await this.leadsRepository.createLeadsBatch(leadsWithDefaults);

      // Vinculación masiva con una empresa
      if (companyId) {
        await this.leadsRepository.linkLeadsToCompany(
          leads.map((l) => l.id),
          companyId
        );
      }

      return leads;
    } catch (error) {
      console.error('Error in saveGoogleMapsLeadsBatch use case:', error);
      throw error;
    }
  }

  /**
   * Verificar lead duplicado
  */
  async checkDuplicateLead(phone: string, email?: string): Promise<Lead | null> {
    try {
      if (!phone) {
        throw new Error('Teléfono requerido');
      }

      return await this.leadsRepository.checkDuplicateLead(phone, email);
    } catch (error) {
      console.error('Error in checkDuplicateLead use case:', error);
      throw error;
    }
  }

  /**
   * Fusionar leads duplicados
  */
  async mergeDuplicateLeads(primaryLeadId: number, duplicateLeadIds: number[]): Promise<Lead> {
    try {
      if (!primaryLeadId || primaryLeadId <= 0) {
        throw new Error('ID de lead principal inválido');
      }

      if (!duplicateLeadIds || duplicateLeadIds.length === 0) {
        throw new Error('IDs de leads duplicados requeridos');
      }

      // Verificar que todos los leads existen
      const primaryLead = await this.leadsRepository.getLeadById(primaryLeadId);
      if (!primaryLead) {
        throw new Error('Lead principal no encontrado');
      }

      for (const duplicateId of duplicateLeadIds) {
        const duplicateLead = await this.leadsRepository.getLeadById(duplicateId);
        if (!duplicateLead) {
          throw new Error(`Lead duplicado con ID ${duplicateId} no encontrado`);
        }
      }

      return await this.leadsRepository.mergeDuplicateLeads(primaryLeadId, duplicateLeadIds);
    } catch (error) {
      console.error('Error in mergeDuplicateLeads use case:', error);
      throw error;
    }
  }

  /**
   * Calcular score de lead basado en diferentes criterios
  */
  async calculateLeadScore(lead: Lead): Promise<number> {
    try {
      let score = 0;

      // Score basado en fuente
      switch (lead.source) {
        case LeadSource.GOOGLE_MAPS:
          score += 20;
          break;
        case LeadSource.REFERRAL:
          score += 30;
          break;
        case LeadSource.WEB_FORM:
          score += 25;
          break;
        default:
          score += 10;
      }

      // Score basado en información disponible
      if (lead.email) score += 10;
      if (lead.website) score += 15;
      if (lead.address) score += 5;
      if (lead.industry) score += 10;

      // Score basado en reviews (si existen)
      if (lead.reviews && Array.isArray(lead.reviews) && lead.reviews.length > 0) {
        score += Math.min(lead.reviews.length * 2, 20);
      }

      // Score basado en horarios de atención
      if (lead.opening_hours) score += 5;

      return Math.min(score, 100); // Máximo 100
    } catch (error) {
      console.error('Error in calculateLeadScore use case:', error);
      throw error;
    }
  }
} 