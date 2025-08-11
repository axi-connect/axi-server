import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';

/**
 * Repositorio de integración con Cloudinary.
 * - Responsabilidad única: manejo de subidas a Cloudinary.
 * - No contiene lógica de negocio; sólo integración externa.
*/
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Resultado mínimo esperado al subir un recurso a Cloudinary.
*/
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export class CloudinaryRepository {
    constructor() {
        const missing: string[] = [];
        if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
        if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
        if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

        if (missing.length > 0) {
            console.warn(
                `\x1b[33m⚠️  Faltan variables de entorno para Cloudinary: ${missing.join(', ')}. ` +
                `Configúralas para habilitar las subidas (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).\x1b[0m`
            );
        }
    }

    /**
     * Construye un Data URI a partir de un Buffer.
     * Permite subir a Cloudinary directamente desde memoria.
    */
    private buildDataUri(buffer: Buffer, mimeType?: string): string {
        const resolvedMime = mimeType && mimeType.includes('/') ? mimeType : 'image/jpeg';
        const base64 = buffer.toString('base64');
        return `data:${resolvedMime};base64,${base64}`;
    }

    /**
     * Sube una imagen a Cloudinary desde un Buffer en memoria.
    */
    async uploadFromBuffer(buffer: Buffer, options?: UploadApiOptions): Promise<CloudinaryUploadResult> {
        try {
            if (!buffer || buffer.length === 0) throw new Error('buffer is required');

            const dataUri = this.buildDataUri(buffer);

            const uploadResult: UploadApiResponse = await cloudinary.uploader.upload(dataUri, {
                resource_type: 'image',
                secure: true,
                ...options,
            });

            return {
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id,
            };
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Cloudinary uploadFromBuffer failed: ${message}`);
        }
    }
}