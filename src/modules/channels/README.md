# 📡 Módulo Channels - Axi Connect

El **Módulo Channels** es el punto de entrada de toda la comunicación omnicanal en **Axi Connect**. Se encarga de gestionar la conexión, autenticación, envío y recepción de mensajes en diversos canales de comunicación (WhatsApp, Telegram, Email, SMS, etc.), además de mantener las conversaciones activas y sus mensajes asociados.

## 🎯 Propósito

Proporcionar una interfaz unificada para gestionar múltiples canales de comunicación, permitiendo a las empresas interactuar con sus clientes a través de diferentes plataformas de mensajería de manera consistente y escalable.

## 🏗️ Arquitectura

### Patrón Arquitectónico
El módulo sigue los principios de **Clean Architecture** y **Hexagonal Architecture**, implementando:

- **Separación de responsabilidades** clara
- **Inyección de dependencias** para testabilidad
- **Interfaces bien definidas** para desacoplamiento
- **Validación robusta** con Joi
- **Documentación automática** con OpenAPI

### Estructura de Directorios

```
src/modules/channels/
├── application/
│   ├── services/            # Servicios de aplicación
│   │   ├── channel-runtime.service.ts     # ⚡ Gestión de providers activos
│   │   ├── channel-websocket.gateway.ts   # 🔌 Gateway WebSocket bidireccional
│   │   ├── auth-session.service.ts         # 🔐 Gestión de sesiones con Redis
│   │   └── provider-health-check.service.ts # 🩺 Validación de credenciales
│   └── use-cases/           # Lógica de negocio (Use Cases) - Refactorizado
│       ├── channel.usecases.ts             # 📋 Operaciones CRUD básicas de canales
│       ├── channel-auth.usecases.ts        # 🔐 Lógica completa de autenticación
│       ├── message.usecases.ts
│       ├── conversation.usecases.ts
│       ├── channel-credential.usecases.ts
│       └── attachment.usecases.ts
├── domain/
│   ├── entities/            # Modelos de dominio puros
│   │   ├── channel.ts
│   │   ├── message.ts
│   │   ├── conversation.ts
│   │   ├── channel-credential.ts
│   │   └── attachment.ts
│   └── repositories/        # Interfaces de repositorios
│       ├── channel-repository.interface.ts
│       ├── message-repository.interface.ts
│       ├── conversation-repository.interface.ts
│       └── credential-repository.interface.ts
├── infrastructure/
│   ├── controllers/         # Controladores HTTP
│   │   ├── channel.controller.ts
│   │   ├── message.controller.ts
│   │   └── conversation.controller.ts
│   ├── repositories/        # Implementaciones concretas de repositorios
│   │   ├── channel.repository.ts
│   │   ├── message.repository.ts
│   │   ├── conversation.repository.ts
│   │   └── credential.repository.ts
│   ├── routes/                    # Configuración de rutas
│   │   ├── main.routes.ts          # 📍 Archivo principal/orquestador
│   │   ├── channel.routes.ts      # Rutas específicas de channels
│   │   ├── message.routes.ts      # Rutas específicas de messages
│   │   └── conversation.routes.ts # Rutas específicas de conversations
│   ├── providers/           # Proveedores de canales externos
│   │   ├── BaseProvider.ts
│   │   ├── WhatsappProvider.ts    # 🟢 WhatsApp Web con manejo EBUSY
│   │   ├── MetaProvider.ts
│   │   ├── TwilioProvider.ts
│   │   └── CustomProvider.ts
│   ├── channels.container.ts       # 🏗️ Contenedor de dependencias
│   └── runtime-initializer.ts      # 🚀 Inicializador del runtime layer
├── shared/
│   ├── dtos/                # Data Transfer Objects
│   │   └── channel.dto.ts
│   └── validators/          # Validadores con Joi
│       └── channel.validator.ts
├── openapi.yaml             # 📖 Documentación OpenAPI
└── README.md                # 📋 Esta documentación
```

### **🏗️ Arquitectura Implementada**

#### **1. ✅ ChannelRuntimeService**
- **Función**: Servicio central que gestiona el ciclo de vida de los providers activos
- **Características**:
  - Mapa en memoria de providers activos (`activeProviders: Map<string, BaseProvider>`)
  - Inicialización automática de canales activos al arranque del backend (`initializeActiveChannels()`)
  - Métodos principales: `startChannel()`, `stopChannel()`, `restartChannel()`, `getChannelStatus()`, `emitMessage()`
  - Integración con WebSocket para eventos en tiempo real
  - Manejo robusto de errores y limpieza automática de recursos
  - Factory method para instanciar providers según tipo (`createProviderInstance()`)

#### **2. ✅ ChannelWebSocketGateway**
- **Función**: Gateway bidireccional para comunicación en tiempo real usando Namespaces
- **Arquitectura**: Basada en Namespaces de Socket.IO para organización modular
- **Características**:
  - **4 Namespaces especializados** con handlers dedicados:
    - `/auth` - Autenticación y gestión de compañías
    - `/channel` - Unión/salida de canales y consultas de estado
    - `/message` - Envío y recepción de mensajes
    - `/system` - Health checks y operaciones del sistema
  - **Handlers especializados** con middlewares propios por namespace
  - **Eventos tipados** con interfaces TypeScript específicas
  - **Separación de responsabilidades** clara entre autenticación, canales, mensajes y sistema
  - **Gestión robusta de conexiones** con limpieza automática
  - **Estadísticas detalladas** por namespace (`getStats()`)
  - **Shutdown graceful** de todos los namespaces

#### **9.1 ✅ Autenticación JWT en WebSocket**
- **Middleware compartido**: `SocketAuthMiddleware` para validación de tokens JWT
- **Extracción automática**: Desde headers `Authorization`, query params o handshake auth
- **Información de usuario**: Adjuntada automáticamente al socket (`socket.user`)
- **Validación de tokens**: Verificación de expiración y tipo (access/refresh)
- **Namespaces protegidos**: `/channel`, `/message`, `/system` requieren autenticación
- **Namespace público**: `/auth` permite conexiones no autenticadas inicialmente
- **Interfaces tipadas**: `AuthenticatedUser`, `AuthenticatedSocket` para type safety
- **IDs de socket independientes**: Cada conexión WebSocket tiene ID único (comportamiento correcto)
- **Múltiples conexiones por usuario**: Un usuario puede tener conexiones simultáneas a diferentes namespaces

#### **10. ✅ AuthSessionService**
- **Función**: Gestión de sesiones de autenticación con persistencia en Redis y limpieza automática de QRs
- **Características**:
  - Integración completa con Redis para almacenamiento de sesiones serializadas
  - **Limpieza automática de QRs**: Eliminación automática de archivos QR tras autenticación exitosa
  - Métodos de persistencia: `saveSerializedSession()`, `getSerializedSession()`, `deleteSerializedSession()`
  - Recuperación automática de sesiones al reinicio del backend
  - Evita re-escanear QR después de reinicios del sistema
  - Gestión de expiración de sesiones con limpieza automática
  - **Limpieza de sesiones expiradas**: Método `cleanupExpiredSessions()` para mantenimiento
  - **Optimización de espacio**: Evita acumulación innecesaria de archivos QR
  - Map en memoria con respaldo en Redis para alta performance

#### **11. ✅ ChannelsContainer (Dependency Injection)**
- **Función**: Contenedor singleton para gestión centralizada de dependencias
- **Características**:
  - Patrón Singleton para instancia única global
  - Inicialización ordenada de todos los servicios (`initialize()`)
  - Gestión del ciclo de vida completo (`shutdown()`)
  - Inyección automática de dependencias entre servicios
  - Método `updateWebSocketGateway()` para reconexión de WebSocket
  - Acceso controlado a servicios a través de getters

#### **5. ✅ RuntimeInitializer**
- **Función**: Orquestador de inicialización del Channel Runtime Layer
- **Características**:
  - Inicialización secuencial y ordenada de todos los componentes
  - Configuración automática de WebSocket Gateway con runtime service
  - Inicialización de canales activos al arranque
  - Manejo de errores durante inicialización (no bloqueante)
  - Setup de señales de limpieza del sistema (`SIGTERM`, `SIGINT`)
  - Exposición global del contenedor para acceso desde rutas

#### **6. ✅ Providers (Sistema de Proveedores)**

##### **BaseProvider (Clase Base Abstracta)**
- **Métodos estándar**:
  - `isAuthenticated()`: Verifica estado de autenticación actual
  - `destroy()`: Limpieza completa de recursos y conexiones
  - `setMessageHandler()`: Configuración de callback para mensajes entrantes
  - `emitMessage()`: Emisión de mensajes al runtime service
  - `validateCredentials()`: Validación de credenciales con el provider

##### **WhatsappProvider (WhatsApp Web con manejo avanzado)**
- **Características avanzadas**:
  - **Manejo robusto de EBUSY**: Detección y limpieza automática de sesiones corruptas
  - **Eventos críticos**: `disconnected`, `auth_failure` con notificación WebSocket
  - **Recuperación automática**: Restauración de sesiones desde Redis
  - **Limpieza de sesiones**: `handleSessionCleanup()` para resolución de conflictos
  - **Reconexión inteligente**: Verificación de conexión antes de enviar mensajes
  - **Timeouts y debouncing**: Optimización de procesamiento de mensajes
  - **Restauración de sesiones**: Evita re-escanear QR después de reinicios

##### **Otros Providers**
- **MetaProvider**: Soporte para WhatsApp Business API (OAuth/Token)
- **TwilioProvider**: Implementación básica para SMS/WhatsApp Business
- **CustomProvider**: Flexibilidad para integraciones personalizadas

#### **7. ✅ Arquitectura de Rutas Modular**
- **Función**: Sistema modular y escalable de gestión de rutas
- **Características**:
  - Rutas separadas por entidad: `channel.routes.ts`, `message.routes.ts`, `conversation.routes.ts`
  - Factory functions con inyección de dependencias
  - `main.routes.ts` como orquestador central
  - Inicialización lazy con contenedor de dependencias
  - Middleware de autenticación y autorización integrado

#### **7. ✅ Arquitectura de Casos de Uso Modular**
- **ChannelUseCases**: Operaciones CRUD básicas de canales (leer, actualizar, eliminar)
- **ChannelAuthUseCases**: Lógica especializada de autenticación y creación de canales
- **Separación clara**: Autenticación ≠ Operaciones CRUD
- **Delegación inteligente**: `ChannelUseCases` delega autenticación a `ChannelAuthUseCases`
- **Principio SRP**: Single Responsibility Principle aplicado

#### **8. ✅ Mejoras de Tipos y Validación**
- **ChannelEntity**: `credentials_id` ahora nullable para reflejar realidad de BD
- **Validaciones Joi**: Esquemas robustos para todos los endpoints
- **Type Safety**: Eliminación de tipos `any` y uso de interfaces específicas
- **Error Handling**: Respuestas consistentes con `HttpError` personalizado
- **Repository Pattern**: Abstracción completa de acceso a datos

#### **9. ✅ RedisClient Mejorado**
- **Función**: Cliente Redis centralizado y robusto
- **Características**:
  - Patrón Singleton para instancia única
  - Reconexión automática y manejo de errores
  - Métodos completos: `setEx()`, `get()`, `del()`, `exists()`, `keys()`, etc.
  - Pub/Sub support con cleanup automático
  - Timeout configurables y gestión de concurrencia
  - Logging detallado para debugging

#### **10. ✅ Eventos del Sistema en Tiempo Real**
- **Tipos de eventos emitidos**:
  - `channel.status.updated` - Estado del canal cambió
  - `channel.message.received` - Nuevo mensaje entrante
  - `channel.auth.required` - Se requiere autenticación
  - `channel.disconnected` - Canal desconectado del provider (LOGOUT desde dispositivo)
  - `channel.auth_failure` - Fallo de autenticación
  - `channel.disconnect_error` - Error durante desconexión (manejo robusto)
  - `channel.auth_failure_error` - Error durante fallo de autenticación
  - `channel.session_cleaned` - Sesión limpiada exitosamente después de desconexión
  - `channel.started` - Canal iniciado exitosamente
  - `channel.stopped` - Canal detenido
  - `channel.joined` - Cliente unido al canal exitosamente 

- **Ejemplos de uso por Namespace con Autenticación JWT**:

  > **💡 Nota importante**: Cada conexión WebSocket tiene un ID único generado por Socket.IO, incluso para el mismo usuario. Esto permite múltiples pestañas/conexiones simultáneas y es el comportamiento esperado/correcto.
  >
  > **Ejemplo del comportamiento observado:**
  > ```
  > Usuario: mariana.garcia@example.com
  > ├── /auth → Socket ID: VTu_Adkoi5OlMaEyAAAD ✅
  > ├── /channel → Socket ID: W_9AHC1emgQl2ySkAAAJ ✅
  > ├── /message → Socket ID: X_7BHD2fmgRl3yTlAAAK ✅
  > └── /system → Socket ID: Y_8CHD3gnhSm4zUmAAAL ✅
  > ```
  ```typescript
  import io from 'socket.io-client';

  // 1. Obtener token JWT (desde localStorage, cookies, etc.)
  const token = localStorage.getItem('accessToken'); // o desde tu sistema de auth

  // 2. Conectar al namespace de autenticación (requiere token)
  const authSocket = io('/auth', {
    auth: {
      token: token
    },
    // O alternativamente usando headers:
    // extraHeaders: {
    //   'Authorization': `Bearer ${token}`
    // }
  });

  // Escuchar eventos de autenticación
  authSocket.on('authenticated', (data) => {
    console.log('✅ Autenticado:', data);
  });

  authSocket.on('auth_error', (error) => {
    console.error('❌ Error de autenticación:', error);
  });

  // 3. Conectar al namespace de canales (requiere token)
  const channelSocket = io('/channel', {
    auth: {
      token: token
    }
  });

  // Unirse a un canal
  channelSocket.emit('channel.join', { channelId: 'abc-123' });

  // Consultar estado de canal
  channelSocket.emit('channel.status', { channelId: 'abc-123' });

  // Escuchar eventos del canal
  channelSocket.on('channel.joined', (data) => {
    console.log('📱 Unido al canal:', data.channelId);
  });

  channelSocket.on('channel.status_response', (data) => {
    console.log('📊 Estado del canal:', data);
  });

  // 4. Conectar al namespace de mensajes (requiere token)
  const messageSocket = io('/message', {
    auth: {
      token: token
    }
  });

  // Escuchar confirmación de envío
  messageSocket.on('message_sent', (data) => {
    console.log('✅ Mensaje enviado:', data);
  });

  // Escuchar mensajes entrantes
  messageSocket.on('message_received', (data) => {
    console.log('📨 Mensaje recibido:', data);
  });

  // 5. Conectar al namespace del sistema (requiere token)
  const systemSocket = io('/system', {
    auth: {
      token: token
    }
  });

  // Health check
  systemSocket.emit('health_check');

  // Ping/Pong para mantener conexión
  systemSocket.emit('ping', { timestamp: Date.now() });

  systemSocket.on('pong', (data) => {
    const latency = Date.now() - data.timestamp;
    console.log('🏓 Latencia:', latency, 'ms');
  });

  systemSocket.on('health_response', (data) => {
    console.log('💚 Health check:', data);
  });

  // 6. Manejo de errores común para todos los namespaces
  [authSocket, channelSocket, messageSocket, systemSocket].forEach(socket => {
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error.message);
      if (error.message.includes('Token')) {
        // Token expirado o inválido - redirigir a login
        window.location.href = '/login';
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado:', reason);
    });
  });
  ```

#### **12. ✅ Limpieza Automática de QRs**
- **Eliminación automática**: QRs eliminados inmediatamente tras autenticación exitosa
- **Limpieza programada**: Cron jobs ejecutan limpieza cada hora y diariamente a las 2 AM
- **Optimización de espacio**: Evita acumulación innecesaria de archivos en disco
- **Manejo robusto de errores**: Continúa operación aunque falle eliminación de QR
- **Limpieza manual**: Métodos administrativos para limpieza bajo demanda
- **Estadísticas de limpieza**: Monitoreo del estado de QRs y sesiones expiradas
- **QRCleanupService**: Servicio dedicado para gestión de limpieza de QRs

#### **13. ✅ Recuperación de Errores Avanzada**
- **Manejo de EBUSY**: Sesiones corruptas detectadas y limpiadas automáticamente
- **ProtocolError de Puppeteer**: Errores `Target closed`, `Session closed` manejados gracefully
- **Timeouts en operaciones**: `Promise.race` para evitar operaciones colgadas
- **Reconexión automática**: Intento de reconexión antes de enviar mensajes
- **Limpieza de recursos**: Liberación automática de timers, conexiones y memoria
- **Persistencia de estado**: Sesiones guardadas en Redis para recuperación
- **Eventos de error**: Notificación inmediata al frontend sin desconectar WebSocket
- **Estado local prioritario**: Limpieza inmediata del estado interno antes de operaciones externas

## 🚀 API Endpoints

### Canales (Channels)
Gestiona la configuración y estado de los canales de comunicación.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/channels` | Crear un nuevo canal |
| `GET` | `/channels` | Listar canales (con filtros y paginación) |
| `GET` | `/channels/:id` | Obtener canal específico |
| `PUT` | `/channels/:id` | Actualizar canal |
| `DELETE` | `/channels/:id` | Eliminar canal (soft delete) |
| `GET` | `/channels/:id/qr` | Obtener código QR para autenticación |

### Conversaciones (Conversations)
Maneja las conversaciones activas en cada canal.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/channels/conversations` | Crear conversación |
| `GET` | `/channels/conversations/:id` | Obtener conversación |
| `PUT` | `/channels/conversations/:id` | Actualizar conversación |
| `PUT` | `/channels/conversations/:id/assign-agent` | Asignar agente |
| `PUT` | `/channels/conversations/:id/unassign-agent` | Desasignar agente |
| `GET` | `/channels/conversations/:conversationId/messages` | Obtener mensajes de conversación |

### Mensajes (Messages)
Gestiona el envío y recepción de mensajes.

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/channels/messages` | Enviar mensaje |
| `GET` | `/channels/messages/:id` | Obtener mensaje específico |
| `PUT` | `/channels/messages/:id/status` | Actualizar estado del mensaje |

## 📊 Modelos de Datos

### Channel (Canal)
```typescript
interface ChannelEntity {
  id: string;                    // UUID único
  name: string;                  // Nombre del canal
  type: ChannelType;            // CALL, EMAIL, WHATSAPP, etc.
  config?: any;                 // Configuración específica del proveedor
  provider: ChannelProvider;    // META, TWILIO, CUSTOM
  is_active: boolean;           // Estado del canal
  credentials_id: string;       // FK a ChannelCredential
  provider_account: string;     // Cuenta del proveedor (única)
  default_agent_id?: number;    // Agente por defecto
  company_id: number;           // Empresa propietaria
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;            // Soft delete
}
```

### Conversation (Conversación)
```typescript
interface ConversationEntity {
  id: string;                   // UUID único
  status: string;               // Estado (open, closed, etc.)
  company_id: number;           // Empresa
  channel_id: string;           // Canal asociado
  external_id: string;          // ID externo del proveedor
  assigned_agent_id?: number;   // Agente asignado
  participant_id?: string;      // ID del participante
  participant_meta?: any;       // Metadata del participante
  participant_type: ContactType; // agent, lead, client, etc.
  created_at: Date;
  updated_at: Date;
  last_message_at?: Date;       // Último mensaje
}
```

### Message (Mensaje)
```typescript
interface MessageEntity {
  id: string;                   // UUID único
  from?: string;                // Remitente
  to?: string;                  // Destinatario
  message: string;              // Contenido del mensaje
  payload?: any;                // Payload adicional
  metadata?: any;               // Metadata del mensaje
  direction: MessageDirection;  // incoming | outgoing
  timestamp: Date;              // Fecha del mensaje
  conversation_id: string;      // Conversación asociada
  status: MessageStatus;        // PENDING, SENT, DELIVERED, etc.
  content_type: string;         // Tipo de contenido
  created_at: Date;
  updated_at: Date;
}
```

## 🔐 Autenticación y Autorización

### Autenticación
- **JWT Bearer Token** requerido en todas las rutas
- Middleware `authenticate` aplicado globalmente
- Tokens generados por el módulo Auth

### Autorización (RBAC)
- Control de acceso basado en roles y permisos
- Middleware `authorize` por endpoint
- Permisos específicos por módulo:
  - `/channels` → `create`, `read`, `update`, `delete`
  - `/messages` → `create`, `read`, `update`
  - `/conversations` → `create`, `read`, `update`

## ✅ Validaciones

### Campos Requeridos
- `name`: Nombre del canal (1-255 caracteres)
- `type`: Tipo de canal (WHATSAPP, TELEGRAM, EMAIL, etc.)
- `provider`: Proveedor (META, TWILIO, CUSTOM)
- `provider_account`: Cuenta del proveedor (única)
- `company_id`: ID de empresa (debe existir en el sistema)
- `credentials`: Credenciales (obligatorio para META/TWILIO, opcional para CUSTOM)

### Validaciones de Integridad
- **Empresa existente**: Se valida que `company_id` corresponda a una empresa registrada
- **Cuenta única**: No se permiten cuentas de proveedor duplicadas (`provider_account`)
- **Credenciales válidas**: Para proveedores OAuth, se verifica la autenticidad antes de guardar

## 🔐 Flujos de Inicialización y Autenticación

El módulo implementa **dos fases distintas** para la gestión de canales, dependiendo del tipo de proveedor:

### 📋 **Fase A: Inicialización** (Registro del Canal)
Creación del canal con configuración base en el sistema.

#### Proveedores con OAuth/Token (META, TWILIO)
```bash
POST /channels
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "WhatsApp Business Principal",
  "type": "WHATSAPP",
  "provider": "META",
  "provider_account": "573001234567",
  "credentials": {
    "accessToken": "EAAKb8xYZ123...",
    "phoneNumberId": "123456789",
    "appId": "987654321"
  },
  "config": {
    "webhookUrl": "https://miapp.com/webhooks/whatsapp",
    "timeout": 5000
  },
  "company_id": 1
}
```

**Respuesta**: Canal creado y **activado automáticamente** (is_active = true)

#### Proveedores con Login Manual (CUSTOM - WhatsApp Web)
```bash
POST /channels
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "name": "WhatsApp Web Personal",
  "type": "WHATSAPP",
  "provider": "CUSTOM",
  "provider_account": "573001234567",
  "company_id": 1
}
```

**Respuesta**: Canal creado **inactivo** con sesión de autenticación
```json
{
  "success": true,
  "message": "Channel created successfully",
  "data": {
    "id": "uuid",
    "name": "WhatsApp Web Personal",
    "is_active": false,
    "authSession": {
      "sessionId": "session-uuid",
      "status": "pending",
      "expiresAt": "2024-01-15T11:00:00Z"
    }
  }
}
```

### 🔄 **Recuperación Automática de Sesiones**
Para proveedores como WhatsApp Web, el sistema implementa **recuperación automática** de sesiones:

#### Restauración de Sesión Existente
```bash
GET /channels/{channelId}/qr
Authorization: Bearer <your-jwt-token>
```

Si existe una sesión válida en Redis, el sistema la restaura automáticamente:
```json
{
  "successful": true,
  "message": "Session restored successfully",
  "data": {
    "sessionRestored": true,
    "channelId": "uuid",
    "status": "authenticated"
  }
}
```

#### Generación de Nuevo QR (cuando no hay sesión válida)
```json
{
  "successful": true,
  "data": {
    "qrCode": "1@abc123def456...[QR data real de WhatsApp]",
    "qrCodeUrl": "/qr-images/qr-session-uuid.svg",
    "sessionId": "session-uuid",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

### 🚨 **Manejo Avanzado de Errores**

#### Recuperación Automática de EBUSY
Cuando ocurre el error `EBUSY: resource busy or locked`, el sistema:

1. **Detecta el error** automáticamente
2. **Limpia la sesión corrupta** de Redis y memoria
3. **Destruye la instancia anterior** (si existe)
4. **Notifica al WebSocket** del evento `channel.disconnected`
5. **Permite regenerar QR** sin desconectar al usuario

```bash
# El usuario puede llamar inmediatamente:
GET /channels/{channelId}/qr
# Sistema responde con nuevo QR limpio
```

#### Eventos de Sistema en Tiempo Real
El sistema emite eventos WebSocket para mantener sincronizado al frontend:

- `channel.disconnected` - Canal desconectado del provider
- `channel.auth_failure` - Fallo de autenticación detectado
- `channel.status.updated` - Cambio de estado del canal
- `channel.message.received` - Mensaje entrante procesado

#### Reconexión Inteligente
Antes de enviar mensajes, el sistema verifica la conexión:
```typescript
// Verificación automática antes de enviar
if (!this.client?.info?.wid?.user) {
  // Intenta reconectar automáticamente
  await this.client.initialize();
  await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### 🔓 **Fase B: Autenticación** (Activación del Canal)
Proceso de login/autenticación para canales que lo requieren.

#### Obtener Código QR (para WhatsApp Web)
```bash
GET /channels/{channelId}/qr
Authorization: Bearer <your-jwt-token>
```

**Respuesta**:
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "qrCode": "whatsapp-auth-session-uuid-timestamp",
    "qrCodeUrl": "/api/channels/uuid/qr-image/session-uuid",
    "sessionId": "session-uuid",
    "expiresAt": "2024-01-15T11:00:00Z"
  }
}
```

#### Completar Autenticación
```bash
POST /channels/{channelId}/auth
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "sessionId": "session-uuid",
  "metadata": {
    "phoneNumber": "+573001234567",
    "authenticated": true
  }
}
```

## 📝 Ejemplos de Uso

### Listar Canales con Filtros

```bash
GET /channels?type=WHATSAPP&is_active=true&limit=10&sortBy=created_at&sortDir=desc
Authorization: Bearer <your-jwt-token>
```

### Enviar un Mensaje

```bash
POST /channels/messages
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "from": "573001234567",
  "to": "573002468135",
  "message": "¡Hola! ¿En qué podemos ayudarte?",
  "direction": "outgoing",
  "conversation_id": "uuid-de-la-conversacion",
  "content_type": "text"
}
```

### Gestionar Conversaciones

```bash
# Asignar agente
PUT /channels/conversations/123e4567-e89b-12d3-a456-426614174000/assign-agent
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "agent_id": 42
}

# Desasignar agente
PUT /channels/conversations/123e4567-e89b-12d3-a456-426614174000/unassign-agent
Authorization: Bearer <your-jwt-token>
```

## ⚙️ Configuración

### Variables de Entorno
```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/axi_connect"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="24h"

# Proveedores externos (opcionales)
META_ACCESS_TOKEN="EAAKb8xYZ..."
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-twilio-token"
```

### Configuración de Canales

#### Meta/WhatsApp Business API
```json
{
  "webhookUrl": "https://your-domain.com/webhooks/whatsapp",
  "timeout": 5000,
  "retries": 3,
  "rateLimit": {
    "requests": 1000,
    "period": 3600
  }
}
```

#### Twilio
```json
{
  "timeout": 3000,
  "retries": 2
}
```

## 🔌 Proveedores Soportados

### WhatsApp Web (CUSTOM Provider) - 🟢 **Implementación Avanzada**
- ✅ **Autenticación QR** con recuperación automática
- ✅ **Manejo robusto de EBUSY** - Sesiones corruptas detectadas y limpiadas
- ✅ **Restauración de sesiones** desde Redis (evita re-escanear QR)
- ✅ **Eventos críticos** (`disconnected`, `auth_failure`) con notificación WebSocket
- ✅ **Reconexión inteligente** antes de enviar mensajes
- ✅ **Limpieza automática** de recursos y memoria
- ✅ **Timeouts y debouncing** para optimización de mensajes
- ✅ **Persistencia de estado** entre reinicios del servidor

### Meta (WhatsApp Business API)
- ✅ Envío de mensajes de texto
- ✅ Recepción de mensajes vía webhooks
- ✅ Soporte para templates
- ✅ Manejo de multimedia
- ✅ Autenticación OAuth automática
- ✅ Activación inmediata del canal

### Twilio
- ✅ SMS y WhatsApp
- ✅ Llamadas telefónicas
- ✅ Verificación de números
- ✅ Autenticación por API Key
- ✅ Webhooks configurables

### Custom Provider
- ✅ Integración flexible
- ✅ Webhooks personalizados
- ✅ Protocolos customizados
- ✅ Extensible para cualquier proveedor

## 🧪 Desarrollo y Testing

### Dependencias de Desarrollo
```bash
npm install --save-dev
  @types/jest
  @types/supertest
  jest
  supertest
  ts-jest
```

### Ejecutar Tests
```bash
# Tests unitarios
npm run test:unit

# Tests de integración
npm run test:integration

# Cobertura de código
npm run test:coverage
```

### Estructura de Tests
```
src/modules/channels/
├── __tests__/
│   ├── unit/
│   │   ├── use-cases/
│   │   ├── repositories/
│   │   └── validators/
│   └── integration/
│       ├── routes/
│       └── controllers/
```

## 📚 Documentación Adicional

- **[OpenAPI Specification](openapi.yaml)** - Documentación completa de la API
- **[Database Schema](../../prisma/schema/channels.prisma)** - Esquema de base de datos
- **[Shared Validators](../shared/validators.shared.ts)** - Utilidades de validación comunes

## 🤝 Contribución

### Estándares de Código
- **TypeScript** estricto habilitado
- **ESLint** y **Prettier** configurados
- **Husky** para pre-commits
- **Conventional Commits** requerido

### Flujo de Trabajo
1. Crear rama desde `develop`
2. Implementar funcionalidad con tests
3. Actualizar documentación
4. Crear Pull Request
5. Code Review y aprobación
6. Merge a `main`

## 🚨 Manejo de Errores

### Códigos de Estado HTTP
- `200` - Éxito
- `201` - Recurso creado
- `400` - Datos inválidos
- `401` - No autenticado
- `403` - No autorizado
- `404` - Recurso no encontrado
- `409` - Conflicto (recurso ya existe)
- `500` - Error interno del servidor

### Respuesta de Error Estandarizada
```json
{
  "success": false,
  "message": "Descripción del error",
  "data": null,
  "statusCode": 400
}
```

## 📈 Métricas y Monitoreo

### KPIs del Módulo
- **Tasa de entrega** de mensajes por canal
- **Tiempo de respuesta** promedio
- **Disponibilidad** de canales
- **Volumen de mensajes** procesados

### Logs Estructurados
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "module": "channels",
  "channel_id": "uuid",
  "conversation_id": "uuid",
  "operation": "message_sent",
  "duration_ms": 150,
  "success": true
}
```

## 🔮 Roadmap

### ✅ **Funcionalidades Implementadas**
- [x] **Channel Runtime Layer** - Gestión de sesiones activas y providers
- [x] **WebSocket Gateway** - Comunicación bidireccional en tiempo real
- [x] **Auth Session Service** - Persistencia de sesiones en Redis
- [x] **Manejo de EBUSY** - Recuperación automática de sesiones corruptas
- [x] **Eventos críticos** - Notificación de desconexiones y errores
- [x] **Dependency Injection** - Arquitectura de contenedor centralizado
- [x] **Arquitectura modular** - Rutas separadas por entidad
- [x] **Recuperación de sesiones** - Restauración automática desde Redis
- [x] **Validación robusta** - Joi schemas para todos los endpoints
- [x] **Refactorización modular** - Separación ChannelUseCases ↔ ChannelAuthUseCases

### 🚧 **Próximas Funcionalidades**
- [ ] **Webhooks avanzados** con retry automático y circuit breaker
- [ ] **Plantillas de mensajes** predefinidas con variables dinámicas
- [ ] **Broadcast messaging** masivo con rate limiting
- [ ] **Análisis de conversaciones** con IA integrada
- [ ] **Integración con CRM** externa vía APIs REST
- [ ] **Soporte para más proveedores** (Telegram, Instagram, Messenger)
- [ ] **Message queuing** con RabbitMQ para alta escalabilidad
- [ ] **Dashboard de métricas** en tiempo real
- [ ] **Backup y restore** de configuraciones de canal
- [ ] **Multi-tenancy avanzado** con aislamiento de datos
- [ ] **Load balancing** para múltiples instancias de providers

---

**Módulo desarrollado con ❤️ por el equipo de Axi Connect**

Para soporte técnico: [support@axi-connect.com](mailto:support@axi-connect.com)
Documentación completa: [https://docs.axi-connect.com](https://docs.axi-connect.com)
