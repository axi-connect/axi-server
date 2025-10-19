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
│   └── use-cases/           # Lógica de negocio (Use Cases)
│       ├── channel.usecases.ts
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
│   │   ├── main.route.ts          # 📍 Archivo principal/orquestador
│   │   ├── channel.routes.ts      # Rutas específicas de channels
│   │   ├── message.routes.ts      # Rutas específicas de messages
│   │   └── conversation.routes.ts # Rutas específicas de conversations
│   └── providers/           # Proveedores de canales externos
│       ├── BaseProvider.ts
│       ├── MetaProvider.ts
│       ├── TwilioProvider.ts
│       └── CustomProvider.ts
├── shared/
│   ├── dtos/                # Data Transfer Objects
│   │   └── channel.dto.ts
│   └── validators/          # Validadores con Joi
│       └── channel.validator.ts
├── openapi.yaml             # 📖 Documentación OpenAPI
└── README.md                # 📋 Esta documentación
```

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
| `PUT` | `/channels/:id/activate` | Activar canal |
| `PUT` | `/channels/:id/deactivate` | Desactivar canal |

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
  participant_type: ParticipantType; // agent, lead, client, etc.
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

**Obtener QR para autenticación**:
```bash
GET /channels/{channelId}/qr
Authorization: Bearer <your-jwt-token>
```

**Respuesta con QR real de WhatsApp Web**:
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

**Refrescar QR después de expiración**:
Si la sesión de autenticación expira antes de que el usuario complete el proceso, puedes llamar nuevamente al endpoint `GET /channels/{id}/qr` para generar un nuevo código QR. El sistema automáticamente:

- Detecta que la sesión anterior expiró
- Limpia la instancia anterior del navegador
- Crea una nueva sesión de autenticación
- Genera un QR fresco para escanear

> **Nota**: El sistema maneja automáticamente la limpieza de sesiones expiradas y reinicialización de instancias de WhatsApp para evitar conflictos con Puppeteer.

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

### Meta (WhatsApp Business API)
- ✅ Envío de mensajes de texto
- ✅ Recepción de mensajes vía webhooks
- ✅ Soporte para templates
- ✅ Manejo de multimedia

### Twilio
- ✅ SMS y WhatsApp
- ✅ Llamadas telefónicas
- ✅ Verificación de números

### Custom Provider
- ✅ Integración flexible
- ✅ Webhooks personalizados
- ✅ Protocolos customizados

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
  "operation": "send_message",
  "channel_id": "uuid",
  "conversation_id": "uuid",
  "duration_ms": 150,
  "success": true
}
```

## 🔮 Roadmap

### Próximas Funcionalidades
- [ ] **Webhooks avanzados** con retry automático
- [ ] **Plantillas de mensajes** predefinidas
- [ ] **Broadcast messaging** masivo
- [ ] **Análisis de conversaciones** con IA
- [ ] **Integración con CRM** externa
- [ ] **Soporte para más proveedores** (Telegram, Instagram, etc.)

---

**Módulo desarrollado con ❤️ por el equipo de Axi Connect**

Para soporte técnico: [support@axi-connect.com](mailto:support@axi-connect.com)
Documentación completa: [https://docs.axi-connect.com](https://docs.axi-connect.com)
