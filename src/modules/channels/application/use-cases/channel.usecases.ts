import { HttpError } from '@/shared/errors/http.error.js';
import { ChannelType, ChannelProvider } from '@prisma/client';
import { ChannelRuntimeService } from '../services/channel-runtime.service.js';
import { ChannelEntity, UpdateChannelData } from '../../domain/entities/channel.js';
import { ChannelAuthUseCases, CreateChannelInput, CreateChannelResult } from './channel-auth.usecases.js';
import { ChannelRepositoryInterface, ChannelSearchCriteria } from '../../domain/repositories/channel-repository.interface.js';

export interface UpdateChannelInput {
  name?: string;
  type?: ChannelType;
  provider?: ChannelProvider;
  provider_account?: string;
  config?: any;
  is_active?: boolean;
  default_agent_id?: number;
}

export interface ChannelSearchInput {
  name?: string;
  type?: ChannelType;
  provider?: ChannelProvider;
  is_active?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'updated_at' | 'name';
  sortDir?: 'asc' | 'desc';
}

export class ChannelUseCases {
  constructor(
    private runtimeService: ChannelRuntimeService,
    private channelAuthUseCases: ChannelAuthUseCases,
    private channelRepository: ChannelRepositoryInterface,
  ) {}

  /**
   * Crea un nuevo canal delegando la lógica de autenticación al caso de uso especializado
  */
  async createChannel(input: CreateChannelInput): Promise<CreateChannelResult> {
    return this.channelAuthUseCases.createChannel(input);
  }

  async getChannelById(id: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(id);
    if (!channel) throw new HttpError(404, 'Channel not found');
    return channel;
  }

  async getChannelsByCompany(company_id: number, search?: ChannelSearchInput): Promise<{ channels: ChannelEntity[], total: number }> {
    const criteria: ChannelSearchCriteria = {
      company_id,
      ...search
    };
    return this.channelRepository.search(criteria);
  }

  async updateChannel(id: string, input: UpdateChannelInput): Promise<ChannelEntity> {
    // Verify channel exists
    const existingChannel = await this.channelRepository.findById(id);
    if (!existingChannel) {
      throw new HttpError(404, 'Channel not found');
    }

    // If provider_account is being updated, check for conflicts
    if (input.provider_account && input.provider_account !== existingChannel.provider_account) {
      const conflict = await this.channelRepository.findByProviderAccount(input.provider_account);
      if (conflict) {
        throw new HttpError(409, `Channel with provider account '${input.provider_account}' already exists`);
      }
    }

    const updateData: UpdateChannelData = {
      name: input.name,
      type: input.type,
      provider: input.provider,
      provider_account: input.provider_account,
      config: input.config,
      is_active: input.is_active,
      default_agent_id: input.default_agent_id
    };

    return this.channelRepository.update(id, updateData);
  }

  async deleteChannel(id: string): Promise<boolean> {
    const channel = await this.channelRepository.findById(id);
    if (!channel) {
      throw new HttpError(404, 'Channel not found');
    }

    // Soft delete the channel
    return this.channelRepository.softDelete(id);
  }

  async activateChannel(id: string): Promise<ChannelEntity> {
    return this.channelRepository.update(id, { is_active: true });
  }

  async deactivateChannel(id: string): Promise<ChannelEntity> {
    return this.channelRepository.update(id, { is_active: false });
  }

  async getActiveChannelsByType(type: ChannelType, company_id: number): Promise<ChannelEntity[]> {
    return this.channelRepository.findActiveByType(type, company_id);
  }

  /**
   * Delega la obtención de QR al caso de uso de autenticación
  */
  async getChannelQR(channelId: string): Promise<{ qrCode: string; qrCodeUrl: string; sessionId: string; expiresAt: Date }> {
    return this.channelAuthUseCases.getChannelQR(channelId);
  }

  /**
   * Delega la completación de autenticación al caso de uso especializado
  */
  async completeChannelAuth(channelId: string, sessionId: string, metadata?: any): Promise<ChannelEntity> {
    return this.channelAuthUseCases.completeChannelAuth(channelId, sessionId, metadata);
  }

  /**
   * Inicia un canal en runtime
  */
  async startChannel(channelId: string): Promise<void> {
    await this.runtimeService.startChannel(channelId);
  }

  /**
   * Detiene un canal en runtime
  */
  async stopChannel(channelId: string): Promise<void> {
    await this.runtimeService.stopChannel(channelId);
  }

  /**
   * Reinicia un canal en runtime
  */
  async restartChannel(channelId: string): Promise<void> {
    await this.runtimeService.restartChannel(channelId);
  }

  /**
   * Obtiene el estado de un canal
  */
  async getChannelStatus(channelId: string): Promise<any> {
    return this.runtimeService.getChannelStatus(channelId);
  }

  /**
   * Envía un mensaje a través del runtime
  */
  async sendMessage(channelId: string, message: any): Promise<void> {
    await this.runtimeService.emitMessage(channelId, message);
  }

  /**
   * Verifica si un canal está activo
  */
  isChannelActive(channelId: string): boolean {
    return this.runtimeService.isChannelActive(channelId);
  }

  /**
   * Obtiene IDs de canales activos
  */
  getActiveChannelIds(): string[] {
    return this.runtimeService.getActiveChannelIds();
  }
}
