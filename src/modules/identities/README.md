### 📚 API REST (Swagger-like)

Base path: `/identities`

Empaquetado de respuestas: `ResponseDto<T>` con la forma:
```json
{
  "successful": true,
  "message": "...",
  "data": {},
  "statusCode": 200
}
```

#### Companies
- GET `/identities/companies` — Lista compañías
- GET `/identities/companies/{id}` — Obtiene una compañía
- POST `/identities/companies` — Crea compañía
  - Body:
    ```json
    {
      "nit": "900123456",
      "name": "ACME",
      "city": "Bogotá",
      "address": "Cll 1 # 2-3",
      "industry": "Servicios",
      "activity_description": "Consultoría",
      "company_schedule": { "create": [ {"day": "monday", "time_range": "08:00-18:00"} ] }
    }
    ```
- PUT `/identities/companies/{id}` — Actualiza compañía
  - Body (parcial): `{ "name": "ACME SAS", "city": "Medellín", "address": "Cra 10 # 20-30", "industry": "Tecnología" }`
- DELETE `/identities/companies/{id}` — Elimina compañía

#### Users
- GET `/identities/users` — Lista usuarios
- GET `/identities/users/{id}` — Obtiene usuario
- POST `/identities/users` — Crea usuario
  - Body:
    ```json
    {
      "name": "Jane Doe",
      "phone": "3001234567",
      "email": "jane@acme.com",
      "password": "secret123",
      "company_id": 1,
      "role_id": 2,
      "avatar": "https://..."
    }
    ```
- PUT `/identities/users/{id}` — Actualiza usuario (puede cambiar `role_id`, `company_id`, etc.)
- DELETE `/identities/users/{id}` — Elimina usuario

#### Agents
- GET `/identities/agents` — Lista agentes
- GET `/identities/agents/{id}` — Obtiene agente
- POST `/identities/agents` — Crea agente
  - Body:
    ```json
    {
      "name": "Bot Ventas",
      "phone": "+573001234567",
      "company_id": 1,
      "agentIntention": {
        "create": [
          {
            "intention_id": 1,
            "require_catalog": true,
            "require_schedule": true,
            "require_db": true,
            "require_sheet": false,
            "require_reminder": true,
            "ai_requirement_id": 1
          }
        ]
      }
    }
    ```
- PUT `/identities/agents/{id}` — Actualiza agente (`name`, `phone`, `alive`)
- DELETE `/identities/agents/{id}` — Elimina agente

Notas:
- Roles y permisos: `role_id` debe existir; validado contra módulo RBAC.
- Agentes: intenciones validadas contra `parameters`.
- Respuestas de error usan `ResponseDto` con `successful=false` y código 4xx/5xx.
