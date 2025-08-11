# Schema de Prisma - Axi Connect
## Esquemas de Base de Datos

### 1. RBAC (Role-Based Access Control)
**Modelos incluidos:**
- `Company` - Entidad principal de la empresa
- `User` - Usuarios del sistema
- `Role` - Roles de usuario
- `Module` - Módulos del sistema
- `RoleModule` - Relación entre roles y módulos

**Enums:**
- `permission_type` - Tipos de permisos (read, create, update, delete)

### 2. BUSINESS (Negocio)
**Modelos incluidos:**
- `Client` - Clientes de la empresa
- `Provider` - Proveedores
- `Lead` - Leads/potenciales clientes
- `Product` - Productos del catálogo
- `Catalog` - Catálogos de productos
- `Agenda` - Agendas y citas

**Enums:**
- `document_type` - Tipos de documento (cc, ce, ti, pp, nit)

### 3. CHANNELS (Canales de Comunicación)
**Modelos incluidos:**
- `Agent` - Agentes de comunicación

### 4. PARAMETERS (Parámetros y Configuración)
**Modelos incluidos:**
- `Reminder` - Recordatorios
- `CompanySchedule` - Horarios de la empresa
- `Intention` - Intenciones de IA
- `AIRequirement` - Requisitos de IA
- `AgentIntention` - Relación entre agentes e intenciones
- `Form` - Formularios dinámicos
- `Fields` - Campos de formularios

**Enums:**
- `type_field` - Tipos de campo (string, number, date, email, select, boolean, location)
- `days` - Días de la semana
- `periodicity` - Periodicidad (once, daily, weekly, monthly, yearly)
- `channel` - Canales de comunicación (whatsapp, instagram, telegram, facebook)

## Comandos Útiles

```bash
# Generar el cliente de Prisma
npx prisma generate

# Verificar el schema
npx prisma validate

# Crear una migración
npx prisma migrate dev --name nombre_migracion

# Aplicar migraciones
npx prisma migrate deploy

# Abrir Prisma Studio
npx prisma studio
```

## Versión de Prisma

- **Versión actual:** 6.13.0
- **Estado:** Actualizada a la última versión estable