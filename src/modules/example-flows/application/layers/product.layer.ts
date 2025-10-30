import { redisDB } from '../../../../../database/redis.js';
import { AiService } from "../../../../../services/ai/index.js";
import { catalogDependency } from '../../../../catalog/domain/catalog.interface.js';
import { conversation } from '../../domain/conversation.interface.js';
import { Product } from '@prisma/client';
import { CatalogRepository } from '../../../../catalog/infrastructure/catalog.repository.js';

const PROMPT = `Tu objetivo es extraer el producto que el usuario quiere ordenar en el siguiente formato JSON
PRODUCTOS
{PRODUCTS}

HISTORIAL DE CONVERSACIONES
{HISTORY}

El formato de la respuesta debe ser el siguiente:
{
    "product_id": 1,
}
`;

export default async (conversation:conversation, history:string, catalog_object:catalogDependency[]|undefined):Promise<Product|undefined> =>{
    try {
        const catalog = catalog_object?.map(catalog =>{
            return catalog?.products?.map(product =>{
                return `ID ${product.id} = ${product.name}:${product.description}`
            }).join('\n');
        }).join('\n');

        const content = PROMPT
        .replace('{PRODUCTS}', catalog ?? 'No hay catalogo disponible')
        .replace('{HISTORY}', history);

        const aiService = new AiService();
        const product = await aiService.createChat([{
            role: 'system', content
        }],{type: 'json_object'});

        if(!product) throw new Error('No hay producto disponible');
        const catalogRepository = new CatalogRepository();
        const product_id = JSON.parse(product).product_id;
        const product_object = await catalogRepository.getProduct(product_id);
        return product_object[0];
    } catch (error:any) {

    }
}