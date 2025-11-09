import { StepDefinition, StepContext, StepResult } from '../../domain/interfaces/workflow.interface.js';

/**
 * Servicio para ejecutar pasos individuales de un flujo de trabajo
 * Maneja timeouts, retries, validaciones y manejo de errores
*/
export class StepExecutorService {
    private readonly defaultRetries = 1;
    private readonly defaultTimeoutMs = 30000; // 30 segundos

    /**
     * Ejecuta un paso individual con validaciones y manejo de errores
    */
    async executeStep(step: StepDefinition, context: StepContext): Promise<StepResult> {
        try {
            // 1. Validar condición del paso
            if (step.condition && !step.condition(context)) {
                return {
                    completed: false,
                    error: `Condición del paso '${step.id}' no cumplida`
                };
            }

            // 2. Validar datos requeridos
            const missingData = this.validateRequiredData(context, step.requiredData);
            if (missingData.length > 0) {
                return {
                    completed: false,
                    error: `Datos requeridos faltantes: ${missingData.join(', ')}`
                };
            }

            // 3. Ejecutar paso con timeout y retries
            const timeout = step.timeout || this.defaultTimeoutMs;
            const retries = step.retries || this.defaultRetries;

            let lastError: Error | null = null;

            for (let attempt = 0; attempt <= retries; attempt++) {
                try {
                    return await this.executeWithTimeout(step.execute, context, timeout);
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    if (attempt < retries) {
                        console.warn(`Intento ${attempt + 1} fallido para paso '${step.id}':`, lastError.message);
                        // Esperar un poco antes del siguiente intento
                        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
                    }
                }
            }

            // Si todos los intentos fallaron, usar onError si existe
            if (step.onError && lastError) {
                try {
                    console.log(`Ejecutando callback onError para paso '${step.id}'`);
                    const errorResult = await this.executeWithTimeout(
                        (ctx) => step.onError!(lastError!, ctx),
                        context,
                        timeout
                    );
                    return errorResult
                } catch (error) {
                    console.error(`Error en callback onError para paso '${step.id}':`, error);
                }
            }

            // Si no hay onError o falló, retornar error
            return {
                completed: false,
                error: `Paso '${step.id}' falló después de ${retries + 1} intentos: ${lastError?.message}`
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`Error crítico ejecutando paso '${step.id}':`, err);
            return {
                completed: false,
                error: `Error crítico en paso '${step.id}': ${err.message}`
            };
        }
    }

    /**
     * Valida que los datos requeridos estén disponibles en el contexto
    */
    private validateRequiredData(context: StepContext, requiredData?: string[]): string[] {
        if (!requiredData || requiredData.length === 0) return [];
        const missing: string[] = [];

        for (const key of requiredData) {
            const hasData = context.collectedData[key] !== undefined;
            if (!hasData) missing.push(key);
        }

        return missing;
    }

    /**
     * Ejecuta una función con timeout
     */
    private async executeWithTimeout<T>(
        fn: (context: StepContext) => Promise<T>,
        context: StepContext,
        timeoutMs: number
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout después de ${timeoutMs}ms`));
            }, timeoutMs);

            fn(context)
                .then((result) => {
                    clearTimeout(timeout);
                    resolve(result);
                })
                .catch((error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
        });
    }

}
