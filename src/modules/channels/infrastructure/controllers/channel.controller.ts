import { Request, Response } from 'express';
import { HttpError } from '@/shared/errors/http.error.js';
import { ResponseDto } from '@/shared/dto/response.dto.js';
import { CronRepository } from '@/services/cron-jobs/cron.repository.js';
import { CreateChannelInput } from '@/modules/channels/application/use-cases/channel-auth.usecases.js';
import { ChannelUseCases, UpdateChannelInput, ChannelSearchInput } from '@/modules/channels/application/use-cases/channel.usecases.js';
import { CreateChannelRequestDto, ChannelResponseDto, UpdateChannelRequestDto } from '@/modules/channels/shared/dtos/channel.dto.js';
import { ChannelEntity } from '../../domain/entities/channel.js';

export class ChannelController {
  constructor(private channelUseCases: ChannelUseCases) {}

  private formatter = new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // 24 horas
    timeZone: 'America/Bogota' // Especificar la zona horaria
  });

  private mapToResponseDto(channel: ChannelEntity): ChannelResponseDto {
    return {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      config: channel.config,
      provider: channel.provider,
      is_active: channel.is_active,
      company_id: channel.company_id,
      provider_account: channel.provider_account,
      default_agent_id: channel.default_agent_id,
      created_at: this.formatter.format(channel.created_at),
      updated_at: this.formatter.format(channel.updated_at),
      deleted_at: channel.deleted_at ? this.formatter.format(channel.deleted_at) : undefined
    };
  };

  createChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const body: CreateChannelRequestDto = req.body;

      const input: CreateChannelInput = {
        ...body,
        expires_at: body.expires_at ? new Date(body.expires_at) : undefined
      };

      const {channel} = await this.channelUseCases.createChannel(input);

      const response: ChannelResponseDto = this.mapToResponseDto(channel);

      const responseDto = new ResponseDto(true, 'Channel created successfully', response, 201);
      res.status(201).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  getChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const channel = await this.channelUseCases.getChannelById(id);

      const response: ChannelResponseDto = this.mapToResponseDto(channel);

      const responseDto = new ResponseDto(true, 'Channel retrieved successfully', response, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  listChannels = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchCriteria = res.locals.searchCriteria;
      const company_id = (req as any).user?.company_id; // Assuming middleware adds user to req

      const searchInput: ChannelSearchInput = {
        name: searchCriteria.name,
        type: searchCriteria.type,
        provider: searchCriteria.provider,
        is_active: searchCriteria.is_active,
        limit: searchCriteria.limit,
        offset: searchCriteria.offset,
        sortBy: searchCriteria.sortBy,
        sortDir: searchCriteria.sortDir
      };

      const result = await this.channelUseCases.getChannelsByCompany(company_id, searchInput);

      const channels: ChannelResponseDto[] = result.channels.map((channel: any) => this.mapToResponseDto(channel));

      const responseDto = new ResponseDto(true, 'Channels retrieved successfully', {
        channels,
        total: result.total,
        limit: searchInput.limit,
        offset: searchInput.offset
      }, 200);

      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  updateChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body: UpdateChannelRequestDto = req.body;

      const input: UpdateChannelInput = {
        name: body.name,
        type: body.type,
        config: body.config,
        provider: body.provider,
        provider_account: body.provider_account,
        default_agent_id: body.default_agent_id
      };

      const channel = await this.channelUseCases.updateChannel(id, input);

      const response: ChannelResponseDto = this.mapToResponseDto(channel);

      const responseDto = new ResponseDto(true, 'Channel updated successfully', response, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  deleteChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      await this.channelUseCases.deleteChannel(id);

      const responseDto = new ResponseDto(true, 'Channel deleted successfully', null, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  getChannelQR = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {qrCode, qrCodeUrl, sessionId, expiresAt} = await this.channelUseCases.getChannelQR(id);

      const responseDto = new ResponseDto(true, 'QR code generated successfully', {
        qrCode, qrCodeUrl, sessionId,
        expiresAt: this.formatter.format(expiresAt)
      }, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };
}
