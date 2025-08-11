import Joi from "joi";
import { LeadStatus } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import { ResponseDto } from "../../../shared/dto/response.dto.js";
import { LeadSource, PipelineStage } from "../domain/leads.interface.js";

export class LeadsValidator {
  // Esquemas de validación con Joi
  private static readonly PHONE_REGEX = /^\+(?:[0-9] ?){6,14}[0-9]$/;

  private static readonly baseLeadFields = {
    name: Joi.string().optional().allow(null),
    phone: Joi.string().pattern(LeadsValidator.PHONE_REGEX),
    email: Joi.string().email().optional().allow(null).messages({
      'string.email': 'Formato de email inválido'
    }),
    website: Joi.string().uri().optional().allow(null).messages({
      'string.uri': 'Formato de sitio web inválido'
    }),
    source: Joi.string().valid(...Object.values(LeadSource)).optional(),
    address: Joi.string().optional().allow(null),
    city: Joi.string().optional().allow(null),
    industry: Joi.string().optional().allow(null),
    lead_score: Joi.number().min(0).max(100).optional(),
    status: Joi.string().valid(...Object.values(LeadStatus)).optional(),
    pipeline_stage: Joi.string().valid(...Object.values(PipelineStage)).optional(),
    opening_hours: Joi.object().optional(),
    reviews: Joi.array().optional(),
    notes: Joi.string().optional().allow(null)
  } as const;

  private static createLeadSchema = Joi.object({
    ...LeadsValidator.baseLeadFields,
    phone: LeadsValidator.baseLeadFields.phone.required().messages({
      'string.empty': 'El teléfono es requerido',
      'any.required': 'El teléfono es requerido',
      'string.pattern.base': 'Formato de teléfono inválido. Usa el formato internacional, por ejemplo `+1 408 XXX XXXX` o `+57 XXX XXX XXXX`'
    })
  });

  private static updateLeadSchema = Joi.object({
    ...LeadsValidator.baseLeadFields,
    phone: LeadsValidator.baseLeadFields.phone.optional().messages({
      'string.pattern.base': 'Formato de teléfono inválido. Usa el formato internacional, por ejemplo `+1 408 XXX XXXX` o `+57 XXX XXX XXXX`'
    })
  });

  private static searchCriteriaSchema = Joi.object({
    status: Joi.string().valid(...Object.values(LeadStatus)).optional(),
    source: Joi.string().valid(...Object.values(LeadSource)).optional(),
    industry: Joi.string().optional(),
    city: Joi.string().optional(),
    lead_score_min: Joi.number().min(0).max(100).optional(),
    lead_score_max: Joi.number().min(0).max(100).optional(),
    pipeline_stage: Joi.string().valid(...Object.values(PipelineStage)).optional(),
    limit: Joi.number().min(1).max(100).optional(),
    offset: Joi.number().min(0).optional(),
    view: Joi.string().valid('summary', 'detail').optional().default('summary')
  });

  private static googleMapsSearchSchema = Joi.object({
    location: Joi.string().required().messages({
      'string.empty': 'Ubicación requerida',
      'any.required': 'Ubicación requerida'
    }),
    radius: Joi.number().min(1).max(50000).optional().messages({
      'number.min': 'Radio debe estar entre 1 y 50000 metros',
      'number.max': 'Radio debe estar entre 1 y 50000 metros'
    }),
    type: Joi.string().optional(),
    keyword: Joi.string().optional(),
    maxResults: Joi.number().min(1).max(60).optional().messages({
      'number.min': 'Máximo de resultados debe estar entre 1 y 60',
      'number.max': 'Máximo de resultados debe estar entre 1 y 60'
    })
  });

  // Esquema para GoogleMapsPlaceInterface
  private static googleMapsPlaceSchema = Joi.object({
    url: Joi.string().uri().optional().allow('', null),
    place_id: Joi.string().required().messages({ 'any.required': 'place_id es requerido' }),
    name: Joi.string().required().messages({ 'any.required': 'name es requerido' }),
    address: Joi.string().optional().allow('', null),
    phone: Joi.string().optional().allow('', null),
    website: Joi.string().uri().optional().allow('', null),
    rating: Joi.number().min(0).max(5).optional(),
    reviews: Joi.array().optional(),
    opening_hours: Joi.object().optional(),
    photos: Joi.array().items(Joi.string()).optional(),
    geometry: Joi.object({
      location: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }).required(),
    }).optional(),
    types: Joi.array().items(Joi.string()).optional(),
    business_status: Joi.string().optional().allow('', null),
  });

  private static googleMapsSaveSchema = Joi.object({
    places: Joi.array().items(LeadsValidator.googleMapsPlaceSchema).min(1).required().messages({
      'array.min': 'Debes enviar al menos un lugar de Google Maps',
      'any.required': 'El array de lugares es requerido'
    }),
    companyId: Joi.number().positive().optional(),
  });

  private static mergeLeadsSchema = Joi.object({
    primaryLeadId: Joi.number().positive().required().messages({
      'number.base': 'ID del lead principal inválido',
      'number.positive': 'ID del lead principal inválido',
      'any.required': 'ID del lead principal requerido'
    }),
    duplicateLeadIds: Joi.array().items(Joi.number().positive()).min(1).required().messages({
      'array.min': 'IDs de leads duplicados requeridos',
      'any.required': 'IDs de leads duplicados requeridos'
    })
  });

  /**
   * Validar datos para crear un lead
  */
  static validateCreateLead(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.createLeadSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }

  /**
   * Validar datos para actualizar un lead
  */
  static validateUpdateLead(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.updateLeadSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }

  /**
   * Validar datos de búsqueda
  */
  static validateSearchCriteria(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.searchCriteriaSchema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }

  /**
   * Validar datos de Google Maps
  */
  static validateGoogleMapsSearch(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.googleMapsSearchSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }

  /**
   * Validar datos para guardar leads desde Google Maps (array de lugares)
  */
  static validateGoogleMapsSave(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.googleMapsSaveSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }

  /**
   * Validar datos para fusionar leads
   */
  static validateMergeLeads(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.mergeLeadsSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }
} 