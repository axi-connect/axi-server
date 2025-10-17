import { Request, Response } from 'express';
import { HttpError } from '@/shared/errors/http.error.js';
import { ResponseDto } from '@/shared/dto/response.dto.js';
import { ChannelUseCases, CreateChannelInput, UpdateChannelInput, ChannelSearchInput } from '@/modules/channels/application/use-cases/channel.usecases.js';
import { CreateChannelRequestDto, ChannelResponseDto, UpdateChannelRequestDto, ChannelSearchQueryDto } from '@/modules/channels/shared/dtos/channel.dto.js';

export class ChannelController {
  constructor(private channelUseCases: ChannelUseCases) {}

  createChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const body: CreateChannelRequestDto = req.body;

      const input: CreateChannelInput = {
        name: body.name,
        type: body.type,
        provider: body.provider,
        provider_account: body.provider_account,
        credentials: body.credentials,
        config: body.config,
        default_agent_id: body.default_agent_id,
        company_id: body.company_id,
        expires_at: body.expires_at ? new Date(body.expires_at) : undefined
      };

      const channel = await this.channelUseCases.createChannel(input);

      const response: ChannelResponseDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        config: channel.config,
        provider: channel.provider,
        is_active: channel.is_active,
        provider_account: channel.provider_account,
        default_agent_id: channel.default_agent_id,
        company_id: channel.company_id,
        created_at: channel.created_at.toISOString(),
        updated_at: channel.updated_at.toISOString(),
        deleted_at: channel.deleted_at?.toISOString()
      };

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

      const response: ChannelResponseDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        config: channel.config,
        provider: channel.provider,
        is_active: channel.is_active,
        provider_account: channel.provider_account,
        default_agent_id: channel.default_agent_id,
        company_id: channel.company_id,
        created_at: channel.created_at.toISOString(),
        updated_at: channel.updated_at.toISOString(),
        deleted_at: channel.deleted_at?.toISOString()
      };

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

      const channels: ChannelResponseDto[] = result.channels.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
        type: channel.type,
        config: channel.config,
        provider: channel.provider,
        is_active: channel.is_active,
        provider_account: channel.provider_account,
        default_agent_id: channel.default_agent_id,
        company_id: channel.company_id,
        created_at: channel.created_at.toISOString(),
        updated_at: channel.updated_at.toISOString(),
        deleted_at: channel.deleted_at?.toISOString()
      }));

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
        provider: body.provider,
        provider_account: body.provider_account,
        config: body.config,
        is_active: body.is_active,
        default_agent_id: body.default_agent_id
      };

      const channel = await this.channelUseCases.updateChannel(id, input);

      const response: ChannelResponseDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        config: channel.config,
        provider: channel.provider,
        is_active: channel.is_active,
        provider_account: channel.provider_account,
        default_agent_id: channel.default_agent_id,
        company_id: channel.company_id,
        created_at: channel.created_at.toISOString(),
        updated_at: channel.updated_at.toISOString(),
        deleted_at: channel.deleted_at?.toISOString()
      };

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

  activateChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const channel = await this.channelUseCases.activateChannel(id);

      const response: ChannelResponseDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        config: channel.config,
        provider: channel.provider,
        is_active: channel.is_active,
        provider_account: channel.provider_account,
        default_agent_id: channel.default_agent_id,
        company_id: channel.company_id,
        created_at: channel.created_at.toISOString(),
        updated_at: channel.updated_at.toISOString(),
        deleted_at: channel.deleted_at?.toISOString()
      };

      const responseDto = new ResponseDto(true, 'Channel activated successfully', response, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };

  deactivateChannel = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const channel = await this.channelUseCases.deactivateChannel(id);

      const response: ChannelResponseDto = {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        config: channel.config,
        provider: channel.provider,
        is_active: channel.is_active,
        provider_account: channel.provider_account,
        default_agent_id: channel.default_agent_id,
        company_id: channel.company_id,
        created_at: channel.created_at.toISOString(),
        updated_at: channel.updated_at.toISOString(),
        deleted_at: channel.deleted_at?.toISOString()
      };

      const responseDto = new ResponseDto(true, 'Channel deactivated successfully', response, 200);
      res.status(200).json(responseDto);
    } catch (error: any) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const responseDto = new ResponseDto(false, error.message || 'Internal server error', null, statusCode);
      res.status(statusCode).json(responseDto);
    }
  };
}
