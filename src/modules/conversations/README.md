## Conversations Module

Objetivo: gestionar conversaciones y mensajes omnicanal (WhatsApp, Instagram, Email, etc.), con historial persistente y capacidades tiempo real.

### Arquitectura
- **Domain**: contratos y modelos de negocio.
  - `entities/`: `conversation.ts`, `message.ts`, `attachment.ts`
  - `repositories/`: interfaces `ConversationRepositoryInterface`, `MessageRepositoryInterface`
- **Application**: casos de uso orquestan la lógica usando repositorios.
  - `use-cases/`: `conversation.usecases.ts`, `message.usecases.ts`, `attachment.usecases.ts` (placeholder)
- **Infrastructure**: adaptadores HTTP/WS y repositorios Prisma.
  - `controllers/`: adaptan Request/Response a `ResponseDto<T>`
  - `routes/`: definen endpoints y RBAC con `authorize`
  - `repositories/`: implementaciones Prisma (`ConversationRepository`, `MessageRepository`)
  - `handlers/`: WebSocket message handler (namespace `/message`)

La integración HTTP cuelga bajo `/channels` (véase Channels Router). La integración WebSocket se orquesta desde `channels` runtime y expone el namespace `/message`.

### Entidades (Domain)
- `ConversationEntity`
  - Campos: `id`, `status`, `company_id`, `channel_id`, `external_id`, `assigned_agent_id?`, `participant_id?`, `participant_meta?`, `participant_type`, `created_at`, `updated_at`, `last_message_at?`
- `MessageEntity`
  - Campos: `id`, `from?`, `to?`, `message`, `payload?`, `metadata?`, `direction`, `timestamp`, `conversation_id`, `status`, `content_type`, `created_at`, `updated_at`
- `MessageAttachmentEntity` (definición domain; implementación infra pendiente)

Enums referenciados de Prisma (`channels` schema): `ContactType`, `MessageDirection`, `MessageStatus`.

### Casos de uso (Application)
- `ConversationUseCases`
  - `createConversation(input)` valida `external_id` único por `channel_id` y delega a repo
  - `getConversationById(id)`
  - `getConversationByExternalId(external_id, channel_id)`
  - `updateConversation(id, input)`
  - `assignAgent(conversation_id, agent_id)` / `unassignAgent(conversation_id)`
  - `updateLastMessage(conversation_id, timestamp)`
  - `getActiveConversationsByAgent(agent_id)` / `countConversationsByAgent(agent_id)`
- `MessageUseCases`
  - `sendMessage(input)`
  - `getMessageById(id)`
  - `getMessagesByConversation(conversation_id, criteria?)`
  - `updateMessage(id, input)` / `updateMessageStatus(id, status)`
- `AttachmentUseCases` (contrato para futuro repositorio de adjuntos)

### Repositorios (Infrastructure)
- `ConversationRepository` (Prisma)
  - Tabla: `channels.Conversation`
  - Operaciones: `create`, `findById`, `findByExternalId`, `findByParticipant`, `findByChannel(criteria)`, `search(criteria)`, `update`, `delete`, `assignAgent`, `unassignAgent`, `updateLastMessage`, `countByStatus`, `countByAgent`, `findActiveByAgent`
- `MessageRepository` (Prisma)
  - Tabla: `channels.MessageLog`
  - Operaciones: `create`, `findById`, `findByConversation(criteria)`, `search(criteria)`, `update`, `delete`, `countByConversation`, `findLatestByConversation`, `updateStatus`, `bulkUpdateStatus`

Mapeos relevantes:
- `Conversation.external_id` es `@unique` (clave para idempotencia por proveedor)
- `MessageLog.timestamp` indexado para orden cronológico
- Relaciones: `Conversation.messages` (1:N), `MessageAttachment` (1:N con `MessageLog`)

### API HTTP (Infrastructure/routes)
Rutas expuestas bajo `/channels` (véase `channels/infrastructure/routes/main.routes.ts`). Todas las rutas usan `authenticate` (middleware global de `/channels`) y `authorize(resource, action)` a nivel de endpoint.

- Base: `/channels/conversations`
  - `POST /` → crear conversación
  - `GET /` → listar conversaciones
  - `GET /:id` → obtener conversación
  - `PUT /:id` → actualizar conversación
  - `PUT /:id/assign-agent` → asignar agente
  - `PUT /:id/unassign-agent` → desasignar agente
  - `GET /:conversationId/messages` → listar mensajes de la conversación

- Base: `/channels/messages`
  - `POST /` → enviar mensaje
  - `GET /:id` → obtener mensaje
  - `PUT /:id/status` → actualizar estado del mensaje

Formato de respuesta estándar: `ResponseDto<T> { successful, message, data, statusCode }`.

#### Ejemplos
- Crear conversación
```json
POST /channels/conversations
{
  "company_id": 1,
  "channel_id": "<uuid-channel>",
  "external_id": "wa_session_123",
  "participant_type": "customer",
  "participant_id": "+573001234567",
  "participant_meta": { "profileName": "Juan" }
}
```

- Enviar mensaje
```json
POST /channels/messages
{
  "from": "agent:42",
  "to": "+573001234567",
  "message": "Hola!",
  "direction": "outgoing",
  "conversation_id": "<uuid-conversation>",
  "content_type": "text"
}
```

### Tiempo real (WebSocket)
- Namespace: `/message` (exportado por `channels/infrastructure/handlers/index.ts`)
- Eventos principales:
  - `message_sent` → confirmación al emisor
  - `message_received` → difusión a integrantes del canal
- Validaciones de runtime: canal activo, unión al room, payload mínimo.

### Seguridad y validación
- Autenticación: aplicada a nivel del router de `channels`.
- Autorización: `authorize('/conversations' | '/messages', 'create'|'read'|'update'|'delete')` por endpoint.
- Validadores compartidos (`shared/validators.shared.ts`) disponibles para IDs; actualmente las rutas de conversaciones/mensajes no los usan explícitamente.

### Observaciones y mejoras sugeridas
- Errores de negocio: algunos casos de uso lanzan `Error` genérico (p. ej., not found) y los controladores responden 500; sería preferible lanzar `HttpError(404, '...')` para status precisos.
- Consistencia temporal: al crear/enviar mensaje, actualizar `Conversation.last_message_at` y considerar transacción si aplica.
- Validación de entrada: centralizar esquemas (Joi/Zod) para `create/update` de conversaciones y mensajes.
- Adjuntos: implementar repositorio y casos de uso para `MessageAttachment`.
- Paginación/orden: exponer criterios de `search` vía query params y validar límites.

### Dependencias con otros módulos
- `channels`: router principal y runtime WS; `Channel` y `Agent` en Prisma.
- `shared`: `ResponseDto`, `HttpError`, validadores.
- `core`: servidor HTTP/Socket.IO y middlewares globales desde `src/index.ts`.

### Esquema Prisma relevante (schemas/channels.prisma)
- `Conversation` (UUID), `MessageLog`, `MessageAttachment`
- Enums: `ChannelType`, `ChannelProvider`, `MessageStatus`, `MessageDirection`, `ContactType`

### Guía de extensión
- Añadir endpoints de búsqueda/paginación para conversaciones y mensajes usando los criterios ya soportados por los repositorios.
- Integrar validación de entrada por endpoint y mapear errores a `HttpError`.
- Conectar WS → persistencia para reflejar eventos en `MessageLog` y actualizar `last_message_at`.


