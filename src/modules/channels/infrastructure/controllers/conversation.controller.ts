import { Request, Response } from 'express';
import { HttpError } from '@/shared/errors/http.error.js';
import { ResponseDto } from '@/shared/dto/response.dto.js';
import { ConversationUseCases } from '@/modules/channels/application/use-cases/conversation.usecases.js';

export class ConversationController {
  constructor(private conversationUseCases: ConversationUseCases) {}

  createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = await this.conversationUseCases.createConversation(req.body);

      const responseDto = new ResponseDto(true, 'Conversation created successfully', conversation, 201);
      res.status(201).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const conversation = await this.conversationUseCases.getConversationById(id);

      const responseDto = new ResponseDto(true, 'Conversation retrieved successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  updateConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const conversation = await this.conversationUseCases.updateConversation(id, req.body);

      const responseDto = new ResponseDto(true, 'Conversation updated successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  assignAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { agent_id } = req.body;

      const conversation = await this.conversationUseCases.assignAgent(id, agent_id);

      const responseDto = new ResponseDto(true, 'Agent assigned successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  unassignAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const conversation = await this.conversationUseCases.unassignAgent(id);

      const responseDto = new ResponseDto(true, 'Agent unassigned successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };
}
