/**
 * Interfaz para estandarizar la respuesta de la API.
 * @template T - El tipo de datos que se retorna en el cuerpo de la respuesta.
*/
export interface ResponseInterface<T> {
    successful: boolean;
    message: string;
    data: T | null;
    statusCode : number;
}

/**
 * Clase DTO para manejar la transferencia de datos de respuesta.
 * @template T - El tipo de datos que se retorna.
*/
export class ResponseDto<T> implements ResponseInterface<T> {
    constructor(
        public successful: boolean,
        public message: string,
        public data: T | null,
        public statusCode: number
    ) {}
}