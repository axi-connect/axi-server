// import { Client } from "@prisma/client";
// import { ClientsUsesCases } from "../application/clients.usescases.js";
// import { NextFunction, Request, Response } from "express";

// export class ClientsController{
//     constructor(private clientsUsesCases: ClientsUsesCases){}

//     createClients = async (req: Request, res: Response, next: NextFunction):Promise<void> =>{
//         await this.clientsUsesCases.createClient(req.body)
//     }
// }