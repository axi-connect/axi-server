import { Request, Response } from 'express';
import { HttpError } from '@/shared/errors/http.error.js';
import { ResponseDto } from '@/shared/dto/response.dto.js';
import { MessageUseCases } from '@/modules/channels/application/use-cases/message.usecases.js';

export class MessageController {
  constructor(private messageUseCases: MessageUseCases) {}

  sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const message = await this.messageUseCases.sendMessage(req.body);

      const responseDto = new ResponseDto(true, 'Message sent successfully', message, 201);
      res.status(201).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  getMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const message = await this.messageUseCases.getMessageById(id);

      const responseDto = new ResponseDto(true, 'Message retrieved successfully', message, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  getMessagesByConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;
      const messages = await this.messageUseCases.getMessagesByConversation(conversationId);

      const responseDto = new ResponseDto(true, 'Messages retrieved successfully', messages, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  updateMessageStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const message = await this.messageUseCases.updateMessageStatus(id, status);

      const responseDto = new ResponseDto(true, 'Message status updated successfully', message, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };
}
