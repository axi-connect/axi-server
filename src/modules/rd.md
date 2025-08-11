Repositorio
  async addCommunicationLog(leadId: number, communicationData: any): Promise<any> {
    try {
      const direction = typeof communicationData.is_sent === 'boolean'
        ? (communicationData.is_sent ? 'outgoing' : 'incoming')
        : (communicationData.direction ?? 'outgoing');

      return await (this.db as any).messageLog.create({
        data: {
          entityType: 'Lead',
          entityId: leadId,
          agentId: communicationData.agent_id || null,
          channel: communicationData.channel,
          direction,
          message: communicationData.message,
          metadata: communicationData.metadata || null
        } as any
      });
    } catch (error) {
      console.error('Error adding communication log:', error);
      throw error;
    }
  }

  async getCommunicationLogs(leadId: number): Promise<any[]> {
    try {
      return await (this.db as any).messageLog.findMany({
        where: { entityType: 'Lead', entityId: leadId },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      console.error('Error getting communication logs:', error);
      throw error;
    }
  }

Interface:
  // Operaciones de comunicación
  addCommunicationLog(leadId: number, communicationData: any): Promise<any>;
  getCommunicationLogs(leadId: number): Promise<any[]>;

Caso de uso
  /**
   * Agregar log de comunicación
  */
  async addCommunicationLog(leadId: number, communicationData: any): Promise<any> {
    try {
      if (!leadId || leadId <= 0) {
        throw new Error('ID de lead inválido');
      }

      if (!communicationData.message) {
        throw new Error('Mensaje requerido');
      }

      if (!communicationData.channel) {
        throw new Error('Canal requerido');
      }

      // Verificar que el lead existe
      const existingLead = await this.leadsRepository.getLeadById(leadId);
      if (!existingLead) {
        throw new Error('Lead no encontrado');
      }

      return await this.leadsRepository.addCommunicationLog(leadId, communicationData);
    } catch (error) {
      console.error('Error in addCommunicationLog use case:', error);
      throw error;
    }
  }

  /**
   * Obtener logs de comunicación de un lead
  */
  async getCommunicationLogs(leadId: number): Promise<any[]> {
    try {
      if (!leadId || leadId <= 0) {
        throw new Error('ID de lead inválido');
      }

      // Verificar que el lead existe
      const existingLead = await this.leadsRepository.getLeadById(leadId);
      if (!existingLead) {
        throw new Error('Lead no encontrado');
      }

      return await this.leadsRepository.getCommunicationLogs(leadId);
    } catch (error) {
      console.error('Error in getCommunicationLogs use case:', error);
      throw error;
    }
  }

Controller:
    /**
     * Agregar log de comunicación
    */
    addCommunicationLog = async (req: Request, res: Response) => {
        try {
        const leadId = parseInt(req.params.id);
        const communicationData = req.body;
        const log = await this.leadsUseCases.addCommunicationLog(leadId, communicationData);
        
        const response = new ResponseDto(true, 'Log de comunicación agregado exitosamente', log, 201);
        res.status(201).json(response);
        } catch (error: any) {
        const response = new ResponseDto(false, error.message, null, 400);
        res.status(400).json(response);
        }
    };

    /**
     * Obtener logs de comunicación de un lead
    */
    getCommunicationLogs = async (req: Request, res: Response) => {
        try {
        const leadId = parseInt(req.params.id);
        const logs = await this.leadsUseCases.getCommunicationLogs(leadId);
        
        const response = new ResponseDto(true, 'Logs de comunicación obtenidos exitosamente', logs, 200);
        res.status(200).json(response);
        } catch (error: any) {
        const response = new ResponseDto(false, error.message, null, 400);
        res.status(400).json(response);
        }
    };

Rutas:
// Rutas Communication Logs
// LeadsRouter.post('/:id/communication-logs', validateIdParam('id'), LeadsValidator.validateCommunicationData, leadsController.addCommunicationLog);
// LeadsRouter.get('/:id/communication-logs', validateIdParam('id'), leadsController.getCommunicationLogs);

Validator:
  private static communicationDataSchema = Joi.object({
    message: Joi.string().required().messages({
      'string.empty': 'Mensaje requerido',
      'any.required': 'Mensaje requerido'
    }),
    channel: Joi.string().valid('whatsapp', 'instagram', 'facebook', 'email', 'call').required().messages({
      'any.only': 'Canal inválido',
      'any.required': 'Canal requerido'
    }),
    direction: Joi.string().valid('incoming', 'outgoing').optional(),
    agent_id: Joi.number().optional(),
    is_sent: Joi.boolean().optional(), // compatibilidad: true => outgoing, false => incoming
    metadata: Joi.object().optional()
  });

    /**
   * Validar datos de comunicación
  */
  static validateCommunicationData(req: Request, res: Response, next: NextFunction): void {
    const { error } = LeadsValidator.communicationDataSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      const response = new ResponseDto(false, errorMessage, null, 400);
      res.status(400).json(response);
      return;
    }

    next();
  }