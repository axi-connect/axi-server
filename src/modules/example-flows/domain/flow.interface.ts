import { Company, CompanySchedule } from "@prisma/client";
import { conversation, sendMessageClient } from "./conversation.interface.js";
import { catalogDependency } from "../../../catalog/domain/catalog.interface.js";

export interface paramsFlow{
    history:string,
    conversation:conversation,
    sendMessage: sendMessageClient,
    instructions:string|null,
    catalog?:string,
    company?: Company,
    require_reminder?:boolean,
    schedule?: CompanySchedule[],
    storage?:{sheet:boolean, db:boolean},
    catalog_object?:catalogDependency[]
}