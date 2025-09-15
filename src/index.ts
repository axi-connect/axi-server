import cors from "cors";
import path from 'path';
import "./database/redis.js";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import figlet from "figlet";
import express, { Application } from 'express';
import { RbacRouter } from "./modules/rbac/infrastructure/rbac.routes.js";
import { AuthRouter } from "./modules/auth/infrastructure/auth.routes.js";
import { LeadsRouter } from "./modules/leads/infrastructure/leads.routes.js";
import { CatalogRouter } from "./modules/catalog/infrastructure/catalog.routes.js";
import { ParametersRouter } from "./modules/parameters/infrastructure/parameters.routes.js";
import { IdentitiesRouter } from "./modules/identities/infrastructure/identities.routes.js";
import { WhatsappRoutes } from "./modules/channels/whatsapp/infrastructure/whatsapp.routes.js";

const app:Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dotenv.config();

// Static public (e.g., QR images)
app.use('/public', express.static(path.resolve('src/public')));

// Routes
app.use('/auth', AuthRouter);
app.use('/rbac', RbacRouter);
app.use('/leads', LeadsRouter);
app.use('/catalog', CatalogRouter);
app.use('/identities', IdentitiesRouter);
app.use('/parameters', ParametersRouter);
// Channels
app.use('/whatsapp', WhatsappRoutes);

// Boot Server
app.listen(PORT, () => {
  figlet("axi connect", {font: "Standard", horizontalLayout: "full"}, (err, data)=>{
    console.log(`\x1b[31m${data}\x1b[0m`);
    console.log("\x1b[32m------------- BIENVENIDO AL FUTURO DEL SERVICIO AL CLIENTE -------------\x1b[0m");
  });

  console.log(`Server is listening on port ${PORT}`);
}).on('error', (error) => {
  console.error('Error starting the server:', error);
  process.exit(1);
});