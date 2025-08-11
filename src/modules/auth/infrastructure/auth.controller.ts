import { Request, Response } from "express";
import { AuthUsesCases } from "../application/auth.usescases.js";

export class AuthController{
    constructor(private authUsesCases:AuthUsesCases){}

    login = async(req: Request, res: Response)=>{
        try {
            const user = await this.authUsesCases.login(req.body)
            res.status(200).json({
                data: user,
                successful: true, 
                message: 'Bienvenido',
            })
        } catch (error:any) {
            res.status(500).json({
                data: null,
                successful: false, 
                message: error.message,
            })
        }
    }

    signup = async(req: Request, res: Response)=>{
        try {
            const user = await this.authUsesCases.signup(req.body)
            res
            .status(200)
            .json({
                data: user,
                successful: true, 
                message: 'Bienvenido',
            });
        } catch (error:any) {
            res.status(500).json({
                data: null,
                successful: false,
                message: error.message,
            });
        }
    }
}