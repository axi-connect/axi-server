import { ChannelProvider } from '@prisma/client';
import { MetaProvider } from '../../infrastructure/providers/MetaProvider.js';
import { TwilioProvider } from '../../infrastructure/providers/TwilioProvider.js';
import { CustomProvider } from '../../infrastructure/providers/CustomProvider.js';
import { BaseProvider, ProviderConfig } from '../../infrastructure/providers/BaseProvider.js';

export interface HealthCheckResult {
  isValid: boolean;
  error?: string;
  metadata?: any;
}

export class ProviderHealthCheckService {
  /**
   * Valida las credenciales de un proveedor específico
   * @param provider - Tipo de proveedor
   * @param credentials - Credenciales a validar
   * @param config - Configuración adicional del proveedor
   * @returns Resultado de la validación
   */
  async validateCredentials(
    provider: ChannelProvider,
    credentials: any,
    config?: any
  ): Promise<HealthCheckResult> {
    try {
      const providerConfig: ProviderConfig = {
        ...config,
        ...credentials
      };

      const providerInstance = this.createProviderInstance(provider, providerConfig);

      // Intentar validar las credenciales
      const isValid = await providerInstance.validateCredentials();

      return {
        isValid,
        metadata: isValid ? { validatedAt: new Date().toISOString() } : undefined
      };

    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Error validating credentials',
        metadata: { errorDetails: error }
      };
    }
  }

  /**
   * Realiza una prueba de conexión completa con el proveedor
   * @param provider - Tipo de proveedor
   * @param credentials - Credenciales
   * @param config - Configuración
   * @param testMessage - Mensaje de prueba opcional
   * @returns Resultado de la prueba de conexión
   */
  async testConnection(
    provider: ChannelProvider,
    credentials: any,
    config?: any,
    testMessage?: { to: string; content: string }
  ): Promise<HealthCheckResult> {
    try {
      const providerConfig: ProviderConfig = {
        ...config,
        ...credentials
      };

      const providerInstance = this.createProviderInstance(provider, providerConfig);

      // Validar credenciales primero
      const credentialsValid = await providerInstance.validateCredentials();
      if (!credentialsValid) {
        return {
          isValid: false,
          error: 'Invalid credentials'
        };
      }

      // Si se proporciona un mensaje de prueba, intentar enviarlo
      if (testMessage) {
        const testResult = await providerInstance.sendMessage({
          to: testMessage.to,
          message: testMessage.content,
          type: 'text'
        });

        return {
          isValid: testResult.success,
          error: testResult.error,
          metadata: {
            validatedAt: new Date().toISOString(),
            testMessageSent: testResult.success,
            messageId: testResult.messageId
          }
        };
      }

      return {
        isValid: true,
        metadata: {
          validatedAt: new Date().toISOString(),
          testMessageSent: false
        }
      };

    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Connection test failed',
        metadata: { errorDetails: error }
      };
    }
  }

  /**
   * Crea una instancia del proveedor correspondiente
   */
  private createProviderInstance(provider: ChannelProvider, config: ProviderConfig): BaseProvider {
    switch (provider) {
      case ChannelProvider.META:
        return new MetaProvider(config);

      case ChannelProvider.TWILIO:
        return new TwilioProvider(config);

      case ChannelProvider.CUSTOM:
        return new CustomProvider(config);

      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
