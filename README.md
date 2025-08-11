# 🌐 Axi Connect

> **Marketplace CRM** que conecta empresas con talento creativo y soluciones de marketing auténtico.  
> Versión actual: **AXI ALFA 1.0** – MVP navegable para validar la propuesta de valor.

---

## 📌 Descripción

Axi Connect es una plataforma digital que integra gestión de clientes (CRM) y un **marketplace de influencia** para ayudar a empresas a descubrir, conectar y colaborar con talentos creativos (artistas, streamers, modelos, micro-influencers) de manera eficiente y medible.

**El futuro del servicio al cliente y del marketing omnicanal.**  
Automatiza y centraliza la comunicación de tu empresa en **WhatsApp, Instagram, Facebook, llamadas telefónicas, correo electrónico** y más, impulsado por **Inteligencia Artificial** para ofrecer experiencias personalizadas y maximizar resultados.

El objetivo: **impulsar el crecimiento empresarial con marketing auténtico**, combinando tecnología, datos y creatividad.

El proyecto está diseñado bajo un MVP iterativo y metodologías ágiles, enfocado inicialmente en el mercado colombiano, con planes de expansión a LATAM.

---

## 🚀 ¿Qué es Axi?
Axi Connect es una plataforma que une en un solo lugar:
- **CRM Inteligente** para la gestión de clientes y oportunidades.
- **Automatización de la atención** en múltiples canales digitales.
- **Marketing omnicanal** para campañas más efectivas y segmentadas.
- **Integración con inteligencia artificial** para mejorar la calidad de respuesta, personalizar interacciones y predecir necesidades.

Con Axi, las empresas no solo atienden clientes, sino que los fidelizan, aumentan su conversión y optimizan recursos.

---

### 🚀 Visión
Consolidar Axi como la plataforma líder en **servicio al cliente y marketing digital** en Latinoamérica, ayudando a empresas a adaptarse al presente y liderar el futuro.

Transformar la manera en que marcas y creadores se conectan, eliminando la fricción de los procesos manuales y potenciando la comunicación directa y efectiva, todo dentro de un entorno digital centralizado.

---

## 🧠 Impulsado por Inteligencia Artificial
Axi no solo responde, **entiende**.  
Nuestra IA analiza patrones de comportamiento, sugiere respuestas óptimas y automatiza tareas repetitivas, para que tu equipo se enfoque en cerrar más ventas y ofrecer un servicio excepcional.

## 🚀 Características Principales

- **Gestión de Leads**
  - captura, seguimiento y conversión de clientes potenciales desde diversas fuentes (Google Maps, formularios, etc.).

- **Pipeline de Ventas**
  - Seguimiento visual del estado de cada lead.

- **Perfil de Talento Creativo**: 
  - ficha detallada con métricas, redes sociales y estilo de contenido.

- **Panel de Analíticas**
  - métricas clave para medir rendimiento de campañas y colaboraciones.

- **Atención omnicanal**
  - WhatsApp, Instagram, Facebook Messenger, llamadas telefónicas y email en un solo lugar.
  
- **Automatización inteligente**
  - Bots y flujos conversacionales para atender 24/7.
  - Respuestas asistidas por IA que aprenden de tus interacciones.

- **CRM avanzado**
  - Gestión de leads, clientes y oportunidades.
  - Integración con fuentes externas como Google Maps para captación automática de prospectos.

- **Marketing omnicanal**
  - Campañas segmentadas en todos los canales.
  - Seguimiento de interacciones y métricas en tiempo real.

- **Integraciones rápidas**
  - API REST para conexión con herramientas externas.
  - Compatibilidad con plataformas de e-commerce y ERP.

- **Integración con APIs Externas**
  - Conectores con Google Maps, Cloudinary y servicios de terceros.

- **Automatizaciones**
  - Tareas y notificaciones automáticas para no perder oportunidades.

---

## 🛠️ Stack Tecnológico

- **Backend**: Node.js + TypeScript  
- **Frontend**: React
- **Base de Datos**: PostgreSQL  
- **Integraciones**:  
  - Google Maps API  
  - Google Sheets API
  - Cloudinary (almacenamiento y optimización de imágenes)  
  - Redis (cache de datos y optimización de consultas)  

---

## 📂 Estructura del Proyecto

```bash

axi-connect/
│
├── src/
│   ├── modules/       # Módulos de negocio (Leads, Empresas, Usuarios, etc.)
│   ├── services/      # Integraciones con APIs externas
│   ├── utils/         # Funciones de utilidad y helpers
│   └── config/        # Configuraciones de entorno y base de datos
│
├── tests/             # Pruebas unitarias e integración
├── docs/              # Documentación adicional
├── .env.example       # Variables de entorno de ejemplo
└── README.md          # Este archivo

```

---

## 📥 Instalación y Ejecución

### 1️⃣ Clonar repositorio
```bash
git clone https://github.com/tuusuario/axi-connect.git
cd axi-connect

2️⃣ Configurar variables de entorno
Crear un archivo .env en backend/ con:

DATABASE_URL=postgresql://user:password@localhost:5432/axi_connect
REDIS_URL=redis://localhost:6379
CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx
GOOGLE_MAPS_API_KEY=xxxx

3️⃣ Instalar dependencias
cd axi-connect && npm install

4️⃣ Ejecutar en desarrollo
npm run dev

```

### 📅 Estado del Proyecto
✅ MVP Alfa operativo 
🔄 Mejorando performance y experiencia de usuario

🛠 Próximas funciones:
- Chat en tiempo real entre empresas y talentos
- Integración con pasarelas de pago
- Sistema de reputación y valoraciones

### 📜 Licencia
Este proyecto está bajo la licencia Propietario – consulta el archivo LICENSE para más detalles.

📬 Contacto
📧 Email: gestion.proyectos.axi@gmail.com
🌍 Web: www.axi-connect.com


#### Notas
copy ./src/services/google/credentials.json ./dist/services/google/