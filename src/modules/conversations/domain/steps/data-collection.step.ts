import { AIService } from '@/services/ai/index.js';
import { StepContext, StepResult, StepDefinition } from '../interfaces/workflow.interface.js';

/**
 * Paso reutilizable para recopilación de datos del usuario
 * Extrae información específica del mensaje o solicita datos faltantes
 */
export class DataCollectionStep {
    constructor(private aiService: AIService) {}

    /**
     * Crea un paso para extraer datos específicos del mensaje usando IA
    */
    createDataExtractionStep(options: {
        id: string;
        fields: Array<{
            name: string;
            description: string;
            required: boolean;
            validation?: (value: unknown) => boolean;
        }>;
        nextStep?: string;
        timeout?: number;
        allowPartial?: boolean; // Si permite completar con datos parciales
    }): StepDefinition {
        return {
            retries: 2,
            id: options.id,
            nextStep: options.nextStep,
            timeout: options.timeout || 10000,
            name: `Extracción de Datos: ${options.fields.map(f => f.name).join(', ')}`,
            description: `Extrae los siguientes datos: ${options.fields.map(f => f.description).join(', ')}`,
            // requiredData: options.fields.filter(f => f.required).map(f => f.name),
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    // Construir el prompt para extracción
                    const prompt = JSON.stringify({
                        return_format: "json",
                        fields: options.fields,
                        task: "data_extraction",
                        message: context.message.message,
                        expected_format: {
                            [options.fields[0]?.name || "field_name"]: "extracted_value or null"
                        },
                        instructions: "Extract requested information and return JSON with field names as keys. Use null for missing required data."
                    });

                    console.log('🤖❓ Prompt', prompt);

                    // Extraer datos usando IA
                    const AIResponse = await this.aiService.createJsonChat<Record<string, unknown>>(
                        [
                            { role: 'system', content: 'Eres un extractor de datos. Responde únicamente con JSON válido.' },
                            { role: 'user', content: prompt }
                        ],
                        {
                            temperature: 0,
                            maxTokens: 300
                        }
                    );
                    console.log('🤖 AIResponse', AIResponse);

                    // Validar y filtrar datos extraídos
                    let hasAllRequired = true;
                    const validatedData: Record<string, unknown> = {};

                    for (const field of options.fields) {
                        const value = AIResponse?.[field.name];

                        // Validar si es requerido
                        if (value === null || value === undefined || value === '') {
                            if (field.required) {
                                hasAllRequired = false;
                                continue;
                            }
                        } else {
                            // Aplicar validación personalizada si existe
                            if (field.validation && !field.validation(value)) {
                                console.warn(`Validación fallida para campo ${field.name}: ${value}`);
                                if (field.required) hasAllRequired = false;
                                continue;
                            }
                            validatedData[field.name] = value;
                        }
                    }

                    // Verificar si tenemos todos los datos requeridos
                    if (!hasAllRequired && !options.allowPartial) {
                        return {
                            completed: false,
                            shouldSendMessage: true,
                            data: { partial_data: validatedData },
                            message: `Necesito más información. Por favor proporciona: ${options.fields.filter(f => f.required && !validatedData[f.name]).map(f => f.description).join(', ')}`,
                        };
                    }

                    return {
                        completed: true,
                        data: {
                            extracted_data: validatedData,
                            has_all_required: hasAllRequired
                        }
                    };

                } catch (error) {
                    console.error(`Error en extracción de datos ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al extraer datos: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }

    /**
     * Crea un paso para solicitar datos específicos al usuario
    */
    createDataRequestStep(options: {
        id: string;
        requestMessage: string;
        expectedFields: string[];
        nextStep?: string;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Solicitar Datos al Usuario',
            description: `Solicita información específica: ${options.expectedFields.join(', ')}`,
            timeout: options.timeout || 30000, // Más tiempo para respuesta del usuario
            retries: 1,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                // Este paso solo envía el mensaje de solicitud
                // La respuesta del usuario será procesada en el siguiente paso
                return {
                    completed: true,
                    message: options.requestMessage,
                    shouldSendMessage: true,
                    data: {
                        requested_fields: options.expectedFields,
                        request_timestamp: new Date().toISOString()
                    }
                };
            }
        };
    }

    /**
     * Crea un paso para validar datos recopilados
    */
    createDataValidationStep(options: {
        id: string;
        validations: Array<{
            field: string;
            validator: (value: unknown) => boolean;
            errorMessage: string;
        }>;
        nextStep?: string;
        onValidationFail?: string; // Paso alternativo si falla validación
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Validación de Datos',
            description: 'Valida los datos recopilados en pasos anteriores',
            timeout: 5000,
            retries: 0,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                const errors: string[] = [];

                for (const validation of options.validations) {
                    const value = context.collectedData[validation.field];

                    if (!validation.validator(value)) {
                        errors.push(validation.errorMessage);
                    }
                }

                if (errors.length > 0) {
                    return {
                        completed: false,
                        message: `Datos inválidos:\n${errors.join('\n')}\n\nPor favor corrige la información.`,
                        shouldSendMessage: true,
                        nextStep: options.onValidationFail
                    };
                }

                return {
                    completed: true,
                    data: { validation_passed: true }
                };
            }
        };
    }
}