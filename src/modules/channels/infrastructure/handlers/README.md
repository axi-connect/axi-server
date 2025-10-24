# WebSocket Handlers - Arquitectura por Namespaces

Esta carpeta contiene los handlers especializados para cada namespace de Socket.IO, implementando una arquitectura modular y escalable para la comunicación WebSocket en tiempo real.

## 📁 Estructura de Handlers

### `auth.handler.ts`
**Namespace**: `/auth`
**Responsabilidades**:
- Autenticación de conexiones WebSocket
- Gestión de compañías y permisos
- Validación de tokens y sesiones

**Eventos principales**:
- `authenticate` → `authenticated` | `auth_error`
- Manejo de desconexiones de sockets autenticados

### `channel.handler.ts`
**Namespace**: `/channel`
**Responsabilidades**:
- Unión y salida de canales
- Consultas de estado de canales
- Validación de permisos de acceso

**Eventos principales**:
- `channel.status` → `channel.status_response`
- `channel.join` → `channel.joined`
- `channel.leave` → `channel.left`

### `message.handler.ts`
**Namespace**: `/message`
**Responsabilidades**:
- Envío de mensajes a canales
- Recepción de mensajes desde providers
- Validación de contenido y permisos

**Eventos principales**:
- `send_message` → `message_sent` | `message_error`
- `message_received` (desde providers)

### `system.handler.ts`
**Namespace**: `/system`
**Responsabilidades**:
- Health checks del sistema
- Ping/Pong para mantener conexiones
- Monitoreo de estado general

**Eventos principales**:
- `ping` → `pong`
- `health_check` → `health_response`

## 🚀 Uso desde el Cliente

### Conexión Básica
```typescript
import io from 'socket.io-client';

// Conectar a diferentes namespaces
const authSocket = io('/auth');
const channelSocket = io('/channel');
const messageSocket = io('/message');
const systemSocket = io('/system');
```

### Flujo Típico de Autenticación
```typescript
// 1. Autenticarse primero
authSocket.emit('authenticate', {
  companyId: 123,
  token: 'jwt_token_aqui'
});

authSocket.on('authenticated', (data) => {
  console.log('Autenticado:', data);
  // Ahora puedes usar los otros namespaces
});

// 2. Unirse a un canal
channelSocket.emit('channel.join', {
  channelId: 'abc-123'
});

channelSocket.on('channel.joined', (data) => {
  console.log('Unido al canal:', data.channelId);
});

// 3. Enviar mensajes
messageSocket.emit('send_message', {
  channelId: 'abc-123',
  message: 'Hola mundo!',
  recipient: '+1234567890'
});

// 4. Health check del sistema
systemSocket.emit('ping', { timestamp: Date.now() });
systemSocket.on('pong', (data) => {
  const latency = Date.now() - data.timestamp;
  console.log('Latencia:', latency, 'ms');
});
```

## 🔧 Middlewares por Namespace

Cada handler implementa middlewares específicos:

- **Auth Handler**: Validación básica de estructura de datos
- **Channel Handler**: Verificación de autenticación y permisos de canal
- **Message Handler**: Validación de contenido y pertenencia a canal
- **System Handler**: Rate limiting básico

## 📊 Estadísticas y Monitoreo

Cada handler expone un método `getStats()` que proporciona métricas específicas:

```typescript
// Desde ChannelWebSocketGateway
const stats = gateway.getStats();
console.log('Estadísticas:', stats);
// {
//   auth: { totalCompanies: 5, totalConnections: 12 },
//   channels: { totalChannels: 8, totalConnections: 15 },
//   messages: { status: 'operational' },
//   system: { uptime: 3600000, connections: 3 },
//   totalConnections: 27
// }
```

## 🛡️ Manejo de Errores

Todos los handlers incluyen manejo robusto de errores:

- **Validación de entrada**: Tipos y estructuras requeridas
- **Permisos**: Verificación de acceso antes de operaciones
- **Timeouts**: Prevención de operaciones colgadas
- **Logging**: Seguimiento detallado para debugging
- **Eventos de error**: Notificación clara al cliente

## 🔄 Escalabilidad

Esta arquitectura permite:

- **Agregar nuevos namespaces**: Simplemente crear nuevo handler
- **Extender funcionalidades**: Agregar eventos sin afectar otros
- **Testing independiente**: Cada handler puede testearse por separado
- **Despliegue gradual**: Migrar clientes namespace por namespace
- **Monitoreo granular**: Métricas específicas por funcionalidad
- **Múltiples conexiones por usuario**: Cada pestaña/browser tiene su propio socket ID
- **Aislamiento de namespaces**: Conexiones independientes por funcionalidad

## 🎯 Comportamiento de Conexiones

### **IDs de Socket Independientes** ⭐

**Comportamiento observado (CORRECTO):**
```
🔐 Socket VTu_Adkoi5OlMaEyAAAD autenticado para usuario mariana.garcia@example.com
📡 Socket W_9AHC1emgQl2ySkAAAJ autenticado para usuario mariana.garcia@example.com
```

**¿Por qué diferentes IDs?**
- Cada conexión WebSocket es independiente
- Mismo usuario puede tener múltiples pestañas/conexiones
- Cada namespace (`/auth`, `/channel`, `/message`) tiene su propia conexión
- Socket.IO genera IDs únicos para cada conexión

**Beneficios:**
- ✅ **Múltiples pestañas**: Usuario puede tener CRM abierto en varias pestañas
- ✅ **Namespaces separados**: Conexión dedicada por funcionalidad
- ✅ **Aislamiento**: Problema en un namespace no afecta otros
- ✅ **Escalabilidad**: Balanceo de carga por namespace
- ✅ **Debugging**: Logs específicos por conexión

### **Gestión de Sesiones por Usuario**

```typescript
// Un usuario puede tener múltiples conexiones activas
const userSockets = {
  'mariana.garcia@example.com': {
    auth: 'VTu_Adkoi5OlMaEyAAAD',
    channel: 'W_9AHC1emgQl2ySkAAAJ',
    message: 'X_7BHD2fmgRl3yTlAAAK',
    system: 'Y_8CHD3gnhSm4zUmAAAL'
  }
};
```