import fs from 'fs';
import path from 'path';
import qr from 'qr-image';
import { HttpError } from '@/shared/errors/http.error.js';
import { ChannelType, ChannelProvider } from '@prisma/client';
import { ChannelRuntimeService } from '../services/channel-runtime.service.js';
import { ChannelEntity, CreateChannelData } from '../../domain/entities/channel.js';
import { ProviderHealthCheckService } from '../services/provider-health-check.service.js';
import { AuthSessionService, type AuthSession } from '../services/auth-session.service.js';
import { ChannelRepositoryInterface } from '../../domain/repositories/channel-repository.interface.js';
import { CredentialRepositoryInterface } from '../../domain/repositories/credential-repository.interface.js';

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

export interface CreateChannelResult {
  channel: ChannelEntity;
  authSession?: {
    sessionId: string;
    status: string;
    expiresAt: Date;
  };
}

export class ChannelAuthUseCases {
    private healthCheckService = new ProviderHealthCheckService();

    constructor(
        private channelRuntimeService: ChannelRuntimeService,
        private authSessionService: AuthSessionService,
        private channelRepository: ChannelRepositoryInterface,
        private credentialRepository: CredentialRepositoryInterface,
        private companiesRepository?: { existsById(company_id: number): Promise<boolean> }
    ) {}

    /**
     * Determina si un proveedor requiere autenticación inmediata
    */
    private requiresImmediateAuth(provider: ChannelProvider): boolean {
        return provider === ChannelProvider.META || provider === ChannelProvider.TWILIO;
    }

    /**
     * Crea canal con autenticación inmediata (OAuth/Token providers)
    */
    async createChannelWithAuth(input: CreateChannelInput): Promise<ChannelEntity> {
        const { name, config, type, company_id, credentials, expires_at, provider_account, provider, default_agent_id } = input;

        // Validar que se proporcionen credenciales
        if (!credentials) throw new HttpError(400, 'Credentials are required for OAuth providers');

        // Validar credenciales con el proveedor
        const healthCheck = await this.healthCheckService.validateCredentials(provider, credentials, config);

        if (!healthCheck.isValid) throw new HttpError(400, `Invalid credentials: ${healthCheck.error}`);

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
                credentials_id: credential.id,
                name, type, company_id, provider_account, provider, default_agent_id
            };

            const channel = await this.channelRepository.create(channelData);

            // Actualizar credential con channel_id y activar
            await this.credentialRepository.update(credential.id, { channel_id: channel.id, is_active: true});

            return channel;
        } catch (error) {
            // Si falla la creación del canal, eliminar las credenciales
            await this.credentialRepository.delete(credential.id);
            throw error;
        }
    }

    /**
     * Crea canal pendiente de autenticación (QR/Web providers)
    */
    async createChannelPendingAuth(input: CreateChannelInput): Promise<CreateChannelResult> {
        // Para proveedores con login manual, las credenciales son opcionales inicialmente
        const { name, config, type, company_id, credentials, expires_at, provider_account, provider, default_agent_id } = input;

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
            credentials_id: credentialId,
            provider_account, default_agent_id,
            name, type, config, provider, company_id
        };

        const channel = await this.channelRepository.create(channelData);

        // Crear sesión de autenticación para proveedores que requieren QR/login manual
        const authSession = await this.authSessionService.createSession(
            channel.id,
            input.provider,
            undefined, // QR se generará después
            undefined, // URL se generará después
        );

        // Actualizar credential con channel_id si existe
        await this.credentialRepository.update(credentialId, { channel_id: channel.id, credentials: authSession });

        return {
            channel,
            authSession: {
                sessionId: authSession.id,
                status: authSession.status,
                expiresAt: authSession.expiresAt
            }
        };
    }

    /**
     * Obtiene o genera un código QR para autenticación del canal
    */
    async getChannelQR(channelId: string): Promise<{ qrCode: string; qrCodeUrl: string; sessionId: string; expiresAt: Date }> {
        // Verificar que el canal existe y está pendiente de autenticación
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) throw new HttpError(404, 'Channel not found');

        let authSession = await this.authSessionService.getSessionByChannel(channelId);
        
        if (!authSession) console.log(`📭 No hay sesión serializada para canal ${channelId}`);
        else console.log(`🔄 Sesión serializada encontrada para canal ${channelId}`);

        if (authSession?.status === 'completed') throw new HttpError(400, 'Channel is already authenticated');

        // Generar QR usando el runtime service
        const qrResult = await this.channelRuntimeService.generateQR(channelId);

        if (!qrResult || qrResult.length === 0) {
            // String vacío indica que ya está autenticado o listo
            throw new HttpError(400, 'Channel is already authenticated or ready for use');
        }

        const qr_image = qr.image(qrResult, {type: 'svg'});
        const file_name = `qr-${Date.now()}.svg`;
        const file_path =  path.join(process.cwd(), 'src', 'public', 'qr-images', file_name);
        qr_image.pipe(fs.createWriteStream(file_path));

        // QR generado exitosamente
        const qrCodeUrl = `public/qr-images/${file_name}`;
        
        authSession = !authSession 
        ? await this.authSessionService.createSession(channelId, channel.provider, qrResult, qrCodeUrl)
        : await this.authSessionService.updateSession(authSession.id, { qrCode: qrResult, qrCodeUrl: qrCodeUrl } as AuthSession);

        if (channel.credentials_id) {
            await this.credentialRepository.update(channel.credentials_id, { credentials: authSession });
        }

        return {
            qrCode: qrResult,
            qrCodeUrl: qrCodeUrl,
            sessionId: authSession.id,
            expiresAt: authSession.expiresAt
        };
    }

    /**
     * Crea un canal con la lógica de autenticación apropiada según el provider
    */
    async createChannel(input: CreateChannelInput): Promise<CreateChannelResult> {
        // Validar campos requeridos
        if (!input.name || !input.type || !input.provider || !input.provider_account || !input.company_id) {
            throw new HttpError(400, 'Faltan campos requeridos: name, type, provider, provider_account, company_id');
        }

        // Validar que la empresa existe
        const companyExists = this.companiesRepository ? await this.companiesRepository.existsById(input.company_id) : true;
        if (!companyExists) throw new HttpError(400, `La empresa con ID ${input.company_id} no existe`);

        // Verificar que la cuenta del proveedor no esté duplicada
        const existingChannel = await this.channelRepository.findByProviderAccount(input.provider_account);
        if (existingChannel) throw new HttpError(409, `El proveedor ${input.provider} con la cuenta '${input.provider_account}' ya existe`);

        // Determinar el flujo según el tipo de proveedor
        const requiresImmediateAuth = this.requiresImmediateAuth(input.provider);

        if (requiresImmediateAuth) {
            // Flujo A: Proveedores con OAuth/Token (validar antes de guardar)
            const channel = await this.createChannelWithAuth(input);
            return { channel };
        } else {
            // Flujo B: Proveedores con login manual (guardar primero, autenticar después)
            return this.createChannelPendingAuth(input);
        }
    }
}
