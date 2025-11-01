import { ChannelProvider } from '@prisma/client';
import { AuthSessionService } from './auth-session.service.js';
import { type ChannelEntity } from '@/modules/channels/domain/entities/channel.js';
import { type Contact } from '@/modules/conversations/domain/entities/conversation.js';
import { WhatsappProvider } from '@/modules/channels/infrastructure/providers/WhatsappProvider.js';
import { BaseProvider, ProviderConfig } from '@/modules/channels/infrastructure/providers/BaseProvider.js';
import { ChannelStatus, RuntimeMessage, WebSocketEvent } from '@/modules/channels/domain/entities/channel.js';
import { ChannelRepositoryInterface } from '@/modules/channels/domain/repositories/channel-repository.interface.js';
import { MessageIngestionService } from '@/modules/conversations/application/services/message-ingestion.service.js';
import { ConversationResolver } from '@/modules/conversations/application/services/conversation-resolver.service.js';

/**
 * Servicio principal de runtime para gestión de canales activos
 * Mantiene instancias de providers en memoria y gestiona su ciclo de vida
*/
export class ChannelRuntimeService {
    private conversationResolver?: ConversationResolver;
    // private messageIngestion?: MessageIngestionService;
    private activeProviders = new Map<string, BaseProvider>();
    private webSocketCallback?: (event: WebSocketEvent) => void;

    constructor(
        private channelRepository: ChannelRepositoryInterface,
        private authSessionService: AuthSessionService
    ) {}

    /**
     * Configura el callback para emitir eventos WebSocket
    */
    setWebSocketCallback(callback: (event: WebSocketEvent) => void): void {
        this.webSocketCallback = callback;
    }

    setConversationResolver(resolver: ConversationResolver): void {
        this.conversationResolver = resolver;
    }

    // setMessageIngestion(ingestion: MessageIngestionService): void {
    //     this.messageIngestion = ingestion;
    // }

    /**
     * Inicializa automáticamente todos los canales activos al arranque del sistema
    */
    async initializeActiveChannels(): Promise<void> {
        try {
        console.log('🔄 Inicializando canales activos...');

        const activeChannels = await this.channelRepository.findActiveChannels();

        for (const channel of activeChannels) {
            try {
                await this.startChannel(channel.id);
                console.log(`✅ Canal ${channel.id} (${channel.provider}) inicializado`);
            } catch (error) {
            console.error(`❌ Error inicializando canal ${channel.id}:`, error);
            // Emitir evento de error
            this.emitWebSocketEvent({
                event: 'channel.error',
                channelId: channel.id,
                companyId: channel.company_id,
                data: { error: error instanceof Error ? error.message : String(error) },
                timestamp: new Date()
            });
            }
        }

        console.log(`🚀 ${activeChannels.length} canales activos inicializados`);
        } catch (error) {
        console.error('❌ Error inicializando canales activos:', error);
        }
    }

    /**
     * Inicia un canal y lo mantiene activo en memoria
     * @param channelId - El ID del canal a iniciar
     * @returns void
     * @throws Error si el canal no existe o no está marcado como activo
     * @throws Error si el canal ya está activo
     * @throws Error si el canal no es un provider $PROVIDER_NAME activo
    */
    async startChannel(channelId: string): Promise<void> {
        // Verificar si ya está activo
        if (this.activeProviders.has(channelId)) {
            console.log(`📱 Canal ${channelId} ya está activo`);
            return;
        }

        const channel = await this.channelRepository.findById(channelId);
        if (!channel) throw new Error(`Canal ${channelId} no encontrado`);

        // Crear instancia del provider
        const provider = await this.createProviderInstance(channel);

        // Almacenar en memoria
        this.activeProviders.set(channelId, provider);

        // Emitir evento de estado
        this.emitWebSocketEvent({
            event: 'channel.started',
            channelId,
            companyId: channel.company_id,
            data: { provider: channel.provider, type: channel.type },
            timestamp: new Date()
        });

        console.log(`▶️ Canal ${channelId} iniciado (${channel.provider})`);
    }

    /**
     * Detiene un canal y libera recursos
     */
    async stopChannel(channelId: string): Promise<void> {
        const provider = this.activeProviders.get(channelId);
        if (!provider) {
            console.log(`📱 Canal ${channelId} no está activo`);
            return;
        }

        try {
        await provider.destroy();
        this.activeProviders.delete(channelId);

        const channel = await this.channelRepository.findById(channelId);
        if (channel) {
            this.emitWebSocketEvent({
            event: 'channel.stopped',
            channelId,
            companyId: channel.company_id,
            data: { provider: channel.provider },
            timestamp: new Date()
            });
        }

        console.log(`⏹️ Canal ${channelId} detenido`);
        } catch (error) {
        console.error(`❌ Error deteniendo canal ${channelId}:`, error);
        throw error;
        }
    }

    /**
     * Reinicia un canal (útil para recuperación de errores)
     */
    async restartChannel(channelId: string): Promise<void> {
        console.log(`🔄 Reiniciando canal ${channelId}...`);

        try {
            await this.stopChannel(channelId);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Pausa breve
            await this.startChannel(channelId);
        } catch (error) {
            console.error(`❌ Error reiniciando canal ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene el estado actual de un canal
    */
    async getChannelStatus(channelId: string): Promise<ChannelStatus> {
        const channel = await this.channelRepository.findById(channelId);
        if (!channel) throw new Error(`Canal ${channelId} no encontrado`);

        const provider = this.activeProviders.get(channelId);
        const isConnected = !!provider;
        const isAuthenticated = provider ? await provider.isAuthenticated() : false;

        return {
            channelId,
            isConnected,
            isAuthenticated,
            type: channel.type,
            provider: channel.provider,
            lastActivity: new Date() // TODO: Implementar tracking de actividad real
        };
    }

    /**
     * Envía un mensaje a través del canal
    */
    async emitMessage(channelId: string, payload: any): Promise<void> {
        const provider = this.activeProviders.get(channelId);
        if (!provider) {
            throw new Error(`Canal ${channelId} no está activo`);
        }

        try {
            const result = await provider.sendMessage(payload);

            // Emitir evento de mensaje enviado
            const channel = await this.channelRepository.findById(channelId);
            if (channel) {
                this.emitWebSocketEvent({
                    event: 'message.sent',
                    channelId,
                    companyId: channel.company_id,
                    data: { messageId: payload.id, result },
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error(`❌ Error enviando mensaje en canal ${channelId}:`, error);
            throw error;
        }
    }

    /**
     * Genera QR para un canal WhatsApp
    */
    async generateQR(channelId: string): Promise<string> {
        const isChannelActive = this.isChannelActive(channelId);
        if (!isChannelActive) await this.startChannel(channelId);
        
        const provider = this.activeProviders.get(channelId);
        if(!provider || !(provider instanceof WhatsappProvider)) throw new Error(`Canal ${channelId} no es un provider WhatsApp activo`);
        
        return provider.generateQR();
    }

    /**
     * Verifica si un canal está activo en runtime
    */
    isChannelActive(channelId: string): boolean {
        return this.activeProviders.has(channelId);
    }

    /**
     * Obtiene todos los canales activos en runtime
     */
    getActiveChannelIds(): string[] {
        return Array.from(this.activeProviders.keys());
    }

    /**
     * Crea instancia del provider apropiado
    */
    private async createProviderInstance(channel: ChannelEntity): Promise<BaseProvider> {
        const config: ProviderConfig = {
            company_id: channel.company_id,
            emitEventCallback: (event: WebSocketEvent) => this.emitWebSocketEvent(event)
        };

        switch (channel.provider) {
            case ChannelProvider.CUSTOM: 
            case ChannelProvider.DEFAULT:
                const whatsappProvider = new WhatsappProvider(config, channel.id, this.authSessionService);
                // Configurar manejador de mensajes
                whatsappProvider.setMessageHandler(async (data) => await this.handleIncomingMessage(channel.id, data.message, data.contact));
                // Inicializar el cliente de WhatsApp
                const initialized = await whatsappProvider.initialize();
                if (!initialized) throw new Error(`Error inicializando cliente para canal ${channel.id}`);

                return whatsappProvider;

            case ChannelProvider.META:
                // TODO: Implementar MetaProvider
                throw new Error('MetaProvider no implementado aún');

            case ChannelProvider.TWILIO:
                // TODO: Implementar TwilioProvider
                throw new Error('TwilioProvider no implementado aún');

            default:
                throw new Error(`Provider ${channel.provider} no soportado`);
        }
    }

    /**
     * Maneja mensajes entrantes del provider
    */
    private async handleIncomingMessage(channelId: string, message: string, contact: Contact): Promise<void> {
        try {
            // Resolver/crear conversación si el servicio está disponible
            let conversationId: string | undefined = undefined;
            if (this.conversationResolver) {
                if (contact.id) {
                    const conv = await this.conversationResolver.resolve({channelId, contact});
                    conversationId = conv.id;
                }
            }

            // Ingestar mensaje persistente si hay conversación resuelta
            // if (conversationId && this.messageIngestion) {
            //     const providerMessageIdRaw = messageData?.id ?? messageData?.messageId ?? messageData?.msgId;
            //     const providerMessageId: string | undefined = typeof providerMessageIdRaw === 'string' && providerMessageIdRaw.length > 0
            //         ? providerMessageIdRaw
            //         : undefined;
            //     const body: string = String(messageData?.message ?? messageData?.content ?? messageData?.body ?? '');
            //     const from: string | undefined = messageData?.sender ?? messageData?.from;
            //     const to: string | undefined = messageData?.recipient ?? messageData?.to;
            //     const ts: Date = messageData?.timestamp ? new Date(messageData.timestamp) : new Date();
            //     const metadata: unknown = messageData?.metadata ?? messageData;

            //     await this.messageIngestion.ingestIncoming({
            //         channelId,
            //         conversationId,
            //         providerMessageId,
            //         body,
            //         from,
            //         to,
            //         timestamp: ts,
            //         metadata,
            //         contentType: 'text'
            //     });
            // }

            // const runtimeMessage: RuntimeMessage = {
            //     channelId,
            //     content: message,
            //     direction: 'incoming',
            //     timestamp: new Date(),
            //     metadata: contact.meta,
            //     id: `msg_${Date.now()}`,
            // };

            // // Emitir evento WebSocket
            // this.emitWebSocketEvent({
            //     event: 'message.received',
            //     channelId,
            //     companyId: contact.company_id,
            //     data: { ...runtimeMessage, conversationId },
            //     timestamp: new Date()
            // });

            console.log(`📨 Mensaje recibido en canal ${channelId}`);
        } catch (error) {
            console.error(`❌ Error procesando mensaje en canal ${channelId}:`, error);
        }
    }

    /**
     * Emite evento WebSocket si hay callback configurado
    */
    private emitWebSocketEvent(event: WebSocketEvent): void {
        if (this.webSocketCallback)  this.webSocketCallback(event);
    }

    /**
     * Limpieza general al cerrar la aplicación
     */
    async shutdown(): Promise<void> {
        console.log('🛑 Cerrando ChannelRuntimeService...');

        const shutdownPromises = Array.from(this.activeProviders.keys()).map(channelId =>
        this.stopChannel(channelId).catch(error =>
            console.error(`Error deteniendo canal ${channelId}:`, error)
        )
        );

        await Promise.all(shutdownPromises);
        this.activeProviders.clear();

        console.log('✅ ChannelRuntimeService cerrado');
    }
}
