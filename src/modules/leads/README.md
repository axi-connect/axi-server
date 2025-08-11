# Módulo Leads - Axi Connect

## Descripción

El módulo Leads es un componente central de Axi Connect que maneja la generación, gestión, nutrición y conversión de leads B2B. Este módulo implementa funcionalidades robustas de adquisición automatizada de prospectos, un sistema inteligente de monitoreo y calificación, y capacidades avanzadas de marketing de conversión omnicanal potenciadas por IA.

## Características Principales

### 🎯 Explorador de Mercado (Adquisición Automatizada de Leads)

- **Integración con Google Maps**: Búsqueda automática de negocios basada en criterios geográficos
- **Extracción de datos públicos**: Información de contacto, reseñas, horarios de atención
- **Filtrado avanzado**: Por industria, ubicación, tipo de negocio
- **Enriquecimiento de datos**: Normalización y deduplicación automática

### 📊 Gestión Inteligente de Leads

- **Sistema de scoring**: Calificación automática basada en múltiples criterios
- **Estados del pipeline**: Seguimiento del progreso de conversión
- **Filtros avanzados**: Búsqueda por múltiples criterios
- **Paginación**: Manejo eficiente de grandes volúmenes de datos

### 🔄 Nutrición y Comunicación

- **Logs de comunicación**: Historial completo de interacciones
- **Múltiples canales**: WhatsApp, email, redes sociales
- **Enriquecimiento de datos**: Información adicional de fuentes externas
- **Deduplicación**: Fusión automática de leads duplicados

## Arquitectura

El módulo sigue la arquitectura hexagonal (Clean Architecture) con las siguientes capas:

```
src/modules/leads/
├── domain/                 # Entidades y interfaces del dominio
│   ├── leads.interface.ts  # Interfaces y tipos del dominio
│   └── repository.interface.ts # Interfaz del repositorio
├── application/            # Casos de uso
│   └── leads.usecases.ts   # Lógica de negocio
├── infrastructure/         # Implementaciones externas
│   ├── leads.repository.ts # Repositorio de datos
│   ├── leads.controller.ts # Controladores HTTP
│   ├── leads.routes.ts     # Rutas de la API
│   └── leads.validator.ts  # Validadores de entrada
└── README.md              # Documentación
```

## API Endpoints

### CRUD Básico
- `POST /leads` - Crear un nuevo lead
- `GET /leads` - Obtener leads con filtros opcionales
- `GET /leads/:id` - Obtener un lead por ID
- `PUT /leads/:id` - Actualizar un lead
- `DELETE /leads/:id` - Eliminar un lead

### Google Maps
- `POST /leads/google-maps/search` - Buscar lugares en Google Maps
- `GET /leads/google-maps/photo/:photoRef` - Decodificar foto de Google Places Photos
- `POST /leads/google-maps/save` - Guardar lead desde Google Maps

### Deduplicación
- `GET /leads/check-duplicate` - Verificar lead duplicado
- `POST /leads/merge-duplicates` - Fusionar leads duplicados

### Análisis
- `GET /leads/:id/score` - Calcular score de un lead

## Modelos de Datos

### Lead
```typescript
interface Lead {
  id: number;
  name?: string;
  phone: string;
  email?: string;
  website?: string;
  source: string;
  address?: string;
  city?: string;
  industry?: string;
  lead_score: number;
  status: LeadStatus;
  pipeline_stage: string;
  opening_hours?: any;
  reviews?: any;
  notes?: string;
}
```

### Estados del Lead
- `New` - Lead nuevo
- `Cold` - Lead frío
- `Warm` - Lead tibio
- `Hot` - Lead caliente
- `Contacted` - Lead contactado
- `Converted` - Lead convertido

### Fuentes del Lead
- `Google Maps` - Obtenido de Google Maps
- `Manual` - Ingresado manualmente
- `Formulario Web` - Desde formulario web
- `Referido` - Referido por otro
- `Redes Sociales` - Desde redes sociales
- `Campaña de Email` - Desde campaña de email

## Configuración

### Variables de Entorno
```bash
# Google Maps API (opcional)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

### Dependencias
El módulo requiere las siguientes dependencias:

- `@googlemaps/google-maps-services-js` - Para integración con Google Maps
- `@prisma/client` - Para acceso a la base de datos

## Uso

### Crear un Lead
```typescript
const leadData = {
  name: "Empresa Ejemplo",
  phone: "+1234567890",
  email: "contacto@empresa.com",
  source: "Google Maps",
  address: "123 Calle Principal",
  city: "Ciudad",
  industry: "Tecnología"
};

const lead = await leadsUseCases.createLead(leadData);
```

### Buscar en Google Maps
```typescript
const searchParams = {
  location: "Bogotá, Colombia",
  radius: 5000,
  type: "restaurant",
  keyword: "pizza"
};

const places = await leadsUseCases.searchGoogleMapsPlaces(searchParams);
```

### Obtener Leads con Filtros
```typescript
const searchCriteria = {
  status: "Hot",
  industry: "Tecnología",
  city: "Bogotá",
  lead_score_min: 50
};

const leads = await leadsUseCases.getLeads(searchCriteria);
```

## Validaciones
El módulo incluye validaciones robustas para:

- Formato de email
- Teléfono requerido
- Estados válidos
- Fuentes válidas
- Criterios de búsqueda
- Datos de Google Maps
- Datos de comunicación

## Manejo de Errores

Todos los endpoints devuelven respuestas consistentes:

```typescript
// Éxito
{
  data: any,
  successful: true,
  message: "Operación exitosa"
}

// Error
{
  data: null,
  successful: false,
  message: "Descripción del error"
}
```

## Contribución
Para contribuir al módulo Leads:

1. Sigue la arquitectura hexagonal existente
2. Mantén la consistencia con los patrones del proyecto
3. Agrega validaciones apropiadas
4. Documenta nuevos endpoints
5. Incluye tests para nuevas funcionalidades

## Próximas Funcionalidades
- [ ] Integración con LinkedIn para enriquecimiento de datos
- [ ] Sistema de scoring más avanzado con IA
- [ ] Automatización de seguimiento
- [ ] Dashboard de analytics
- [ ] Integración con CRM externos 