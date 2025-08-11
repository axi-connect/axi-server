
import express, { Application } from 'express';
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";

interface Route {
  path: string;
  routes: express.Router;
}

export class ExpressServer {
  private app: Application;

  constructor() {
    this.app = express();

    // Middlewares
    this.configureMiddlewares();
  }

  private configureMiddlewares(): void {
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(morgan("dev"));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    dotenv.config();
  }

  public registerRoutes(routes: Route[]): void {
    routes.forEach(({ path, routes }) => {
      this.app.use(path, routes);
    });
  }

  public async start(port: number | string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
        resolve();
      }).on('error', (error) => {
        reject(error);
      });
    });
  }

  public stop(): void {
    process.exit(0);
  }
}
