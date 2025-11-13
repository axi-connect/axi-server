import cors from "cors";
import path from 'path';
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import figlet from "figlet";
import { createServer } from 'http';
import express, { Application } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { initializeRedis, getRedisClient } from "@/database/redis.js";
// import { CronRepository } from "./services/cron-jobs/cron.repository.js";
import { RbacRouter } from "./modules/rbac/infrastructure/rbac.routes.js";
import { AuthRouter } from "./modules/auth/infrastructure/auth.routes.js";
import { LeadsRouter } from "./modules/leads/infrastructure/leads.routes.js";
import { CatalogRouter } from "./modules/catalog/infrastructure/catalog.routes.js";
// ChannelsRouter se configura dinámicamente después de la inicialización
import { ParametersRouter } from "./modules/parameters/infrastructure/parameters.routes.js";
import { IdentitiesRouter } from "./modules/identities/infrastructure/identities.routes.js";
import { initializeChannelRuntime } from "@/modules/channels/infrastructure/runtime-initializer.js";

const app:Application = express();
const PORT:number = Number(process.env.PORT) || 3000;

// Crear servidor HTTP para Socket.IO
const server = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://axi-connect.local",
  "http://axi-connect.local:3000",
  process.env.FRONTEND_URL || "http://172.18.16.1:3000"
];

// Configurar Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

// Middlewares
app.use(cors({
  origin: allowedOrigins
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dotenv.config();

// Static public (e.g., QR images)
app.use('/public', express.static(path.resolve('src/public'), {
  setHeaders(res) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

// Routes
app.use('/auth', AuthRouter);
app.use('/rbac', RbacRouter);
app.use('/leads', LeadsRouter);
app.use('/catalog', CatalogRouter);
app.use('/identities', IdentitiesRouter);
app.use('/parameters', ParametersRouter);

// Inicializar servicios de infraestructura primero
Promise.all([
  initializeRedis().then((client) => {
    initializeChannelRuntime(io, client).then((result) => {
      // Configurar Channels router con dependencias inicializadas
      app.use('/channels', result.channelsRouter);
      console.log('📡 Channels router configurado');
    })
  })
]).then(() => {
  console.log('🚀 Todos los servicios de infraestructura inicializados');
}).catch((error) => {
  console.error('❌ Error inicializando servicios de infraestructura:', error);
  process.exit(1);
});

// Boot Server (esperar inicialización de servicios)
server.listen(PORT, '0.0.0.0', async () => {
  figlet("axi connect", {font: "Standard", horizontalLayout: "full"}, (err, data)=>{
    console.log(`\x1b[31m${data}\x1b[0m`);
    console.log("\x1b[32m------------- BIENVENIDO AL FUTURO DEL SERVICIO AL CLIENTE -------------\x1b[0m");
  });

  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time communication`);
}).on('error', (error) => {
  console.error('Error starting the server:', error);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`🛑 Recibiendo ${signal}, cerrando servidor y servicios...`);

  try {
    // Cerrar cliente Redis
    const redisClient = getRedisClient();
    await redisClient.disconnect();

    // Cerrar servidor HTTP/Socket.IO
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error durante el cierre graceful:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));