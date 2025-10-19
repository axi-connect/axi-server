import fs from 'fs';
import path from 'path';
import qr from 'qr-image';
import { HttpError } from '@/shared/errors/http.error.js';
import { ChannelType, ChannelProvider } from '@prisma/client';
import { AuthSessionService } from '../services/auth-session.service.js';
import { WhatsappProvider } from '../../infrastructure/providers/WhatsappProvider.js';
import { ProviderHealthCheckService } from '../services/provider-health-check.service.js';
import { ChannelEntity, CreateChannelData, UpdateChannelData } from '../../domain/entities/channel.js';
import { CredentialRepositoryInterface } from '../../domain/repositories/credential-repository.interface.js';
import { ChannelRepositoryInterface, ChannelSearchCriteria } from '../../domain/repositories/channel-repository.interface.js';
export interface CreateChannelInput {
  config?: any;
  name: string;
  type: ChannelType;
  expires_at?: Date;
  company_id: number;
  credentials: any; // Encrypted credentials
  provider_account: string;
  provider: ChannelProvider;
  default_agent_id?: number;
}

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
  private authSessionService = new AuthSessionService();
  private healthCheckService = new ProviderHealthCheckService();
  private whatsappProviders = new Map<string, WhatsappProvider>();

  constructor(
    private channelRepository: ChannelRepositoryInterface,
    private credentialRepository: CredentialRepositoryInterface
  ) {}

  /**
   * Factory method to create WhatsappProvider instances
   * Reuses existing instances or creates new ones, cleaning up expired sessions
   */
  private createWhatsappProvider(channelId: string, config: any, companyId: number): WhatsappProvider {
    const providerConfig = {
      ...config,
      company_id: companyId,
      sendMessageCallback: null,
      onMessage: null
    };

    // Check if we have an existing provider for this channel
    const existingProvider = this.whatsappProviders.get(channelId);

    if (existingProvider) {
      // Check if the session is still active
      const activeSession = this.authSessionService.getActiveSessionByChannel(channelId);
      if (!activeSession) {
        // Session expired or doesn't exist, clean up the old provider
        console.log(`Cleaning up expired WhatsApp provider for channel ${channelId}`);
        existingProvider.destroy().catch(error => {
          console.error(`Error cleaning up WhatsApp provider for channel ${channelId}:`, error);
        });
        this.whatsappProviders.delete(channelId);
      } else {
        // Session is still active, return existing provider
        return existingProvider;
      }
    }

    // Create new provider
    const newProvider = new WhatsappProvider(providerConfig, channelId, this.authSessionService);
    this.whatsappProviders.set(channelId, newProvider);

    return newProvider;
  }

  async createChannel(input: CreateChannelInput): Promise<ChannelEntity & { authSession?: any }> {
    // Validate required fields
    if (!input.name || !input.type || !input.provider || !input.provider_account || !input.company_id) {
      throw new HttpError(400, 'Faltan campos requeridos: name, type, provider, provider_account, company_id');
    }

    // Validate that company exists
    const companyExists = await this.channelRepository.validateCompanyExists(input.company_id);
    if (!companyExists) {
      throw new HttpError(400, `La empresa con ID ${input.company_id} no existe`);
    }

    // Check if provider_account already exists
    const existingChannel = await this.channelRepository.findByProviderAccount(input.provider_account);
    if (existingChannel) {
      throw new HttpError(409, `El proveedor ${input.provider} con la cuenta '${input.provider_account}' ya existe`);
    }

    // Determinar el flujo según el tipo de proveedor
    const requiresImmediateAuth = this.requiresImmediateAuth(input.provider);

    if (requiresImmediateAuth) {
      // Flujo A: Proveedores con OAuth/Token (validar antes de guardar)
      return this.createChannelWithAuth(input);
    } else {
      // Flujo B: Proveedores con login manual (guardar primero, autenticar después)
      return this.createChannelPendingAuth(input);
    }
  }

  /**
   * Determina si un proveedor requiere autenticación inmediata
  */
  private requiresImmediateAuth(provider: ChannelProvider): boolean {
    return provider === ChannelProvider.META || provider === ChannelProvider.TWILIO;
  }

  /**
   * Flujo A: Crear canal con autenticación inmediata (OAuth/Token providers)
   */
  private async createChannelWithAuth(input: CreateChannelInput): Promise<ChannelEntity> {
    const {name, config, type, company_id, credentials, expires_at, provider_account, provider, default_agent_id} = input;
    
    // Validar que se proporcionen credenciales
    if (!credentials) {
      throw new HttpError(400, 'Credentials are required for OAuth providers');
    }

    // Validar credenciales con el proveedor
    const healthCheck = await this.healthCheckService.validateCredentials(provider,credentials,config);

    if (!healthCheck.isValid) {
      throw new HttpError(400, `Invalid credentials: ${healthCheck.error}`);
    }

    // Crear credenciales
    const credentialData = {
      channel_id: '', // Will be updated after channel creation
      provider,
      credentials,
      expires_at
    };

    const credential = await this.credentialRepository.create(credentialData);

    try {
      // Crear canal activo (ya validado)
      const channelData: CreateChannelData = {
        is_active: true,
        credentials_id: credential.id,
        name, type, company_id, provider_account, provider, default_agent_id
      };

      const channel = await this.channelRepository.create(channelData);

      // Actualizar credential con channel_id y activar
      await this.credentialRepository.update(credential.id, {
        channel_id: channel.id,
        is_active: true
      });

      // Activar el canal
      await this.channelRepository.update(channel.id, { is_active: true });

      return channel;
    } catch (error) {
      // Si falla la creación del canal, eliminar las credenciales
      await this.credentialRepository.delete(credential.id);
      throw error;
    }
  }

  /**
   * Flujo B: Crear canal pendiente de autenticación (QR/Web providers)
  */
  private async createChannelPendingAuth(input: CreateChannelInput): Promise<ChannelEntity & { authSession: any }> {
    // Para proveedores con login manual, las credenciales son opcionales inicialmente
    const {name, config, type, company_id, credentials, expires_at, provider_account, provider, default_agent_id} = input;

    // Create inactive initial credentials
    const credentialData = {
      provider, expires_at, 
      credentials: credentials ? credentials : {},
      channel_id: '', // Will be updated after channel creation
      is_active: false // Credentials inactive until authentication
    };

    const credential = await this.credentialRepository.create(credentialData);
    const credentialId = credential.id;

    // Crear canal inactivo (pendiente de autenticación)
    const channelData: CreateChannelData = {
      is_active: false,
      credentials_id: credentialId,
      provider_account, default_agent_id,
      name, type, config, provider, company_id
    };

    const channel = await this.channelRepository.create(channelData);

    // Crear sesión de autenticación para proveedores que requieren QR/login manual
    const authSession = this.authSessionService.createSession(
      channel.id,
      input.provider,
      undefined, // QR se generará después
      undefined, // URL se generará después
      15 // 15 minutos de expiración
    );

    // Actualizar credential con channel_id si existe
    await this.credentialRepository.update(credentialId, { channel_id: channel.id, credentials: authSession });

    return {
      ...channel,
      authSession: {
        sessionId: authSession.id,
        status: authSession.status,
        expiresAt: authSession.expiresAt
      }
    };
  }

  async getChannelById(id: string): Promise<ChannelEntity> {
    const channel = await this.channelRepository.findById(id);
    if (!channel) {
      throw new HttpError(404, 'Channel not found');
    }
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
   * Obtiene o genera un código QR para autenticación del canal
  */
  async getChannelQR(channelId: string): Promise<{ qrCode: string; qrCodeUrl: string; sessionId: string; expiresAt: Date }> {
    // Verificar que el canal existe y está pendiente de autenticación
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) throw new HttpError(404, 'Channel not found');
    if (channel.is_active) throw new HttpError(400, 'Channel is already active');

    // Generar QR usando el provider correspondiente
    let qrCode: string;
    let qrCodeUrl: string;

    switch (channel.provider) {
      case ChannelProvider.CUSTOM:
      case ChannelProvider.DEFAULT:
        // Usar WhatsappProvider para generar QR real de WhatsApp Web
        try {
          const whatsappProvider = this.createWhatsappProvider(channelId, channel.config, channel.company_id);

          // Forzar reinicialización
          const forceReinit = true;

          // Generar QR usando el provider
          const qrResult = await whatsappProvider.generateQR(forceReinit);

          if (qrResult && qrResult.length > 0) {
            const qr_image = qr.image(qrResult, {type: 'svg'});
            const file_name = `qr-${Date.now()}.svg`;
            const file_path =  path.join(process.cwd(), 'src', 'public', 'qr-images', file_name);
            qr_image.pipe(fs.createWriteStream(file_path));

            // QR generado exitosamente
            qrCode = qrResult;
            qrCodeUrl = `public/qr-images/${file_name}`;
          } else {
            // String vacío indica que ya está autenticado o listo
            throw new HttpError(400, 'Channel is already authenticated or ready for use');
          }
        } catch (error: any) {
          console.error('Error generating WhatsApp QR:', error);
          throw new HttpError(500, `Failed to generate QR code: ${error.message}`);
        }
        break;
      default:
        throw new HttpError(400, `QR authentication not supported for provider: ${channel.provider}`);
    }

    // Verificar si ya hay una sesión activa
    let authSession = this.authSessionService.getActiveSessionByChannel(channelId);
    if(!authSession) {
      authSession = this.authSessionService.createSession(channelId, channel.provider, qrCode, qrCodeUrl, 15);
    } else {
      authSession.qrCode = qrCode;
      authSession.qrCodeUrl = qrCodeUrl;
      authSession.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    }

    await this.credentialRepository.update(channel.credentials_id, { credentials: authSession });

    return {
      qrCode,
      qrCodeUrl,
      sessionId: authSession.id,
      expiresAt: authSession.expiresAt
    };
  }

  /**
   * Completa la autenticación de un canal
  */
  async completeChannelAuth(channelId: string, sessionId: string, metadata?: any): Promise<ChannelEntity> {
    // Verificar que el canal existe
    const channel = await this.channelRepository.findById(channelId);
    if (!channel) throw new HttpError(404, 'Channel not found');

    // Verificar la sesión
    const authSession = this.authSessionService.getSession(sessionId);
    if (!authSession || authSession.channelId !== channelId) throw new HttpError(400, 'Invalid authentication session');

    // Verificar si el cliente de WhatsApp está autenticado
    const whatsappProvider = this.createWhatsappProvider(channelId, channel.config, channel.company_id);
    const isAuthenticated = await whatsappProvider.isAuthenticated();
    if (!isAuthenticated) throw new HttpError(400, 'WhatsApp client is not authenticated');

    // Completar la sesión de autenticación
    const completedSession = this.authSessionService.completeSession(sessionId, metadata);

    // Limpiar la instancia del provider ya que ya no es necesaria
    const provider = this.whatsappProviders.get(channelId);
    if (provider) {
      provider.destroy().catch(error => {
        console.error(`Error cleaning up WhatsApp provider for channel ${channelId}:`, error);
      });
      this.whatsappProviders.delete(channelId);
    }

    // Activar el canal
    const updatedChannel = await this.channelRepository.update(channelId, { is_active: true });

    // Actualizar las credenciales si existen
    if (channel.credentials_id) {
      await this.credentialRepository.update(channel.credentials_id, { credentials: completedSession, is_active: true });
    }

    return updatedChannel;
  }
}
