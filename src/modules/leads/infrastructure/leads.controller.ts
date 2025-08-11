import { 
    CreateLeadInterface, 
    UpdateLeadInterface, 
    LeadSearchInterface,
    GoogleMapsPlaceInterface,
    GoogleMapsSearchInterface
} from "../domain/leads.interface.js";
import { Request, Response } from "express";
import { LeadsUseCases } from "../application/leads.usecases.js";
import { ResponseDto } from "../../../shared/dto/response.dto.js";
export class LeadsController {
    constructor(private leadsUseCases: LeadsUseCases) {}

    /**
     * Crear un nuevo lead
    */
    createLead = async (req: Request, res: Response) => {
        try {
            const leadData: CreateLeadInterface = req.body;
            const lead = await this.leadsUseCases.createLead(leadData);
            
            const response = new ResponseDto(true, 'Lead creado exitosamente', lead, 201);
            res.status(201).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Obtener leads con filtros opcionales
    */
    getLeads = async (req: Request, res: Response) => {
        try {
            const searchCriteria: LeadSearchInterface = req.query;
            const leads = await this.leadsUseCases.getLeads(searchCriteria);
            
            const response = new ResponseDto(true, 'Leads obtenidos exitosamente', leads, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Obtener un lead por ID
    */
    getLeadById = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = parseInt(req.params.id);
            const lead = await this.leadsUseCases.getLeadById(id);
            
            if (!lead) {
                const response = new ResponseDto(false, 'Lead no encontrado', null, 404);
                res.status(404).json(response);
                return;
            }

            const response = new ResponseDto(true, 'Lead obtenido exitosamente', lead, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Actualizar un lead
    */
    updateLead = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const updateData: UpdateLeadInterface = { id, ...req.body };
            const lead = await this.leadsUseCases.updateLead(updateData);
            
            const response = new ResponseDto(true, 'Lead actualizado exitosamente', lead, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Eliminar un lead
    */
    deleteLead = async (req: Request, res: Response) => {
        try {
            const id = parseInt(req.params.id);
            const result = await this.leadsUseCases.deleteLead(id);
            
            const response = new ResponseDto(true, 'Lead eliminado exitosamente', result, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Buscar lugares en Google Maps
    */
    searchGoogleMapsPlaces = async (req: Request, res: Response) => {
        try {
            const searchParams: GoogleMapsSearchInterface = req.body;
            const places = await this.leadsUseCases.searchGoogleMapsPlaces(searchParams);
            
            const response = new ResponseDto(true, 'Búsqueda en Google Maps completada exitosamente', places, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Decodifica las rederencias de las fotos de Google Places
    */
    getGooglePhoto = async (req: Request, res: Response) => {
        const { photoRef } = req.params as { photoRef: string };
        if (!photoRef) {
            res.status(400).json(new ResponseDto(false, 'photoRef requerido', null, 400));
            return;
        }

        try {
            const photo = await this.leadsUseCases.getGooglePhoto(photoRef);
            const response = new ResponseDto(true, 'Foto de Google obtenida exitosamente', photo, 200);
            res.status(200).json(response);
        } catch (error) {
            console.error(error);
            res.status(500).json(new ResponseDto(false, 'No se pudo obtener la foto', null, 500));
        }
    };

    /**
     * Guardar leads desde Google Maps en lote
    */
    saveGoogleMapsLead = async (req: Request, res: Response) => {
        try {
            const { places, companyId } = req.body as { places: GoogleMapsPlaceInterface[]; companyId?: number };
            const parsedCompanyId = typeof companyId === 'string' ? parseInt(companyId) : companyId;

            const leads = await this.leadsUseCases.saveGoogleMapsLeadsBatch(places, parsedCompanyId);

            const response = new ResponseDto(true, 'Leads de Google Maps guardados exitosamente', { count: leads.length, leads }, 201);
            res.status(201).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Verificar lead duplicado
    */
    checkDuplicateLead = async (req: Request, res: Response) => {
        try {
            const { phone, email } = req.query;
            const isDuplicate = await this.leadsUseCases.checkDuplicateLead(phone as string, email as string);
            const message = isDuplicate ? 'Lead duplicado encontrado' : 'No se encontraron leads duplicados';
            const response = new ResponseDto(true, message, isDuplicate, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };

    /**
     * Calcular score de lead
    */
    calculateLeadScore = async (req: Request, res: Response) => {
        try {
            const leadId = parseInt(req.params.id);
            const lead = await this.leadsUseCases.getLeadById(leadId);
            
            if (!lead) {
                const response = new ResponseDto(false, 'Lead no encontrado', null, 404);
                res.status(404).json(response);
                return;
            }

            const score = await this.leadsUseCases.calculateLeadScore(lead);
            
            const response = new ResponseDto(true, 'Score del lead calculado exitosamente', { lead, score }, 200);
            res.status(200).json(response);
        } catch (error: any) {
            const response = new ResponseDto(false, error.message, null, 400);
            res.status(400).json(response);
        }
    };
}