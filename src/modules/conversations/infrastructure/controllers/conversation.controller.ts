import { Request, Response } from 'express';
import { HttpError } from '@/shared/errors/http.error.js';
import { ResponseDto } from '@/shared/dto/response.dto.js';
import { parseDateSafe } from '@/shared/utils/utils.shared.js';
import { ConversationSearchInput, ConversationUseCases } from '@/modules/conversations/application/use-cases/conversation.usecases.js';

export class ConversationController {
  constructor(private conversationUseCases: ConversationUseCases) {}

  listConversations = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        status,
        limit,
        offset,
        sortBy,
        sortDir,
        date_to,
        date_from,
        channel_id,
        participant_id,
        participant_type,
        assigned_agent_id,
      } = (res.locals.searchCriteria ?? req.query) as ConversationSearchInput;

      const criteria: ConversationSearchInput = {
        status,
        sortBy,
        sortDir,
        channel_id,
        participant_id,
        participant_type,
        assigned_agent_id,
        date_to: parseDateSafe(date_to),
        offset: Math.max(offset ?? 0, 0),
        date_from: parseDateSafe(date_from),
        limit: Math.min(Math.max(limit ?? 0, 1), 100),
      } as const;

      const conversations = await this.conversationUseCases.listConversations(criteria);
      const responseDto = new ResponseDto(true, 'Conversations retrieved successfully', conversations, 200);
      res.status(200).json(responseDto);
    } catch (error: unknown) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      const responseDto = new ResponseDto(false, message, null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = await this.conversationUseCases.createConversation(req.body);

      const responseDto = new ResponseDto(true, 'Conversation created successfully', conversation, 201);
      res.status(201).json(responseDto);
    } catch (error: unknown) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      const responseDto = new ResponseDto(false, message, null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  getConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const conversation = await this.conversationUseCases.getConversationById(id);

      const responseDto = new ResponseDto(true, 'Conversation retrieved successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: unknown) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      const responseDto = new ResponseDto(false, message, null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  updateConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const conversation = await this.conversationUseCases.updateConversation(id, req.body);

      const responseDto = new ResponseDto(true, 'Conversation updated successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: unknown) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      const responseDto = new ResponseDto(false, message, null, statusCode);
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
    } catch (error: unknown) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      const responseDto = new ResponseDto(false, message, null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  unassignAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const conversation = await this.conversationUseCases.unassignAgent(id);

      const responseDto = new ResponseDto(true, 'Agent unassigned successfully', conversation, 200);
      res.status(200).json(responseDto);
    } catch (error: unknown) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message = error instanceof Error ? error.message : 'Internal server error';
      const responseDto = new ResponseDto(false, message, null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };
}
