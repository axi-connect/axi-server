import { NextFunction, Request, Response} from "express";
import Joi from "joi"

export const scheduleSchema = Joi.object({
    day: Joi.string().min(3).required(),
    time_range: Joi.string().min(3).required()
});

export const intentionSchema = Joi.object({
    code: Joi.string().min(3).required(),
    description: Joi.string().min(3).required(),
    ai_instructions: Joi.string().min(3).required(),
    flow_name: Joi.string().required(),
    agentIntention: Joi.object({create: Joi.object({
        agent_id: Joi.number().required(),
        ai_requirement_id: Joi.number().optional(),
        require_reminder: Joi.boolean().required(),
        require_db: Joi.boolean().required(),
        require_sheet: Joi.boolean().required(),
        require_catalog: Joi.boolean().required(),
        require_schedule: Joi.boolean().required()
    }).required()}).required()
});

export const agentIntentionSchema = Joi.object({
    agent_id: Joi.number(),
    intention_id: Joi.number().required(),
    ai_requirement_id: Joi.number().required(),
    require_catalog: Joi.boolean().required(),
    require_schedule: Joi.boolean().required(),
    require_sheet: Joi.boolean().required(),
    require_db: Joi.boolean().required()
});

const aiRequirementSchema = Joi.object({
    instructions: Joi.array().items(Joi.string()).required()
});

const formSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    company_id: Joi.number().required(),
    table_name: Joi.string().required(),
    fields: Joi.object({
        create: Joi.array().items(Joi.object({
            key: Joi.string().required(),
            label: Joi.string().required(),
            type: Joi.string().required(),
            required: Joi.boolean().required(),
            placeholder: Joi.string().required(),
            options: Joi.array().items(Joi.string()).optional(),
        }))
    })
});

export class ParametersValidator{
    static validateIntentionCreation(req: Request, res: Response, next: NextFunction){

        const {value, error} = intentionSchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }

    static validateAIRequirementsCreation(req: Request, res: Response, next: NextFunction){
        const {value, error} = aiRequirementSchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }

    static validateFormCreation(req: Request, res: Response, next: NextFunction){
        const {value, error} = formSchema.validate(req.body);
        if(error) res.status(400).json({error});
        else next();
    }
}


