import { StepContext, StepResult, StepDefinition } from '../interfaces/workflow.interface.js';

/**
 * Paso reutilizable para integraciones con servicios externos
 * Maneja llamadas a APIs, bases de datos y otros servicios
*/
export class IntegrationStep {

    /**
     * Crea un paso para consultar información del catálogo
    */
    createCatalogQueryStep(options: {
        id: string;
        queryType: 'search' | 'get_by_id' | 'get_all';
        searchTerm?: string; // Para búsquedas
        categoryId?: number; // Para filtrar por categoría
        limit?: number;
        nextStep?: string;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Consulta de Catálogo',
            description: `Consulta catálogo: ${options.queryType}${options.searchTerm ? ` (${options.searchTerm})` : ''}`,
            timeout: options.timeout || 5000,
            retries: 2,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    // TODO: Implementar llamada real al servicio de catálogo
                    // Por ahora simulamos la respuesta
                    const mockCatalogData = {
                        items: [
                            {
                                id: 1,
                                name: 'Producto de Ejemplo',
                                price: 99.99,
                                description: 'Descripción del producto',
                                available: true
                            }
                        ],
                        total: 1
                    };

                    return {
                        completed: true,
                        data: {
                            catalog_results: mockCatalogData,
                            query_type: options.queryType,
                            search_term: options.searchTerm
                        }
                    };

                } catch (error) {
                    console.error(`Error en consulta de catálogo ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al consultar catálogo: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }

    /**
     * Crea un paso para verificar disponibilidad de agenda
     */
    createScheduleAvailabilityStep(options: {
        id: string;
        date?: string; // Formato YYYY-MM-DD
        timeRange?: { start: string; end: string }; // HH:mm format
        serviceType?: string;
        nextStep?: string;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Verificar Disponibilidad de Agenda',
            description: `Verifica slots disponibles${options.date ? ` para ${options.date}` : ''}`,
            timeout: options.timeout || 5000,
            retries: 2,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    // TODO: Implementar llamada real al servicio de agenda
                    // Por ahora simulamos disponibilidad
                    const mockAvailability = {
                        date: options.date || new Date().toISOString().split('T')[0],
                        availableSlots: [
                            '09:00', '10:00', '14:00', '15:00', '16:00'
                        ],
                        timezone: 'America/Bogota'
                    };

                    return {
                        completed: true,
                        data: {
                            schedule_availability: mockAvailability,
                            has_available_slots: mockAvailability.availableSlots.length > 0
                        }
                    };

                } catch (error) {
                    console.error(`Error en verificación de agenda ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al verificar agenda: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }

    /**
     * Crea un paso para crear una reserva/cita
     */
    createAppointmentBookingStep(options: {
        id: string;
        requiredData: string[]; // Campos requeridos: date, time, service_type, etc.
        nextStep?: string;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Crear Reserva/Cita',
            description: 'Crea una nueva reserva en el sistema',
            timeout: options.timeout || 10000,
            retries: 1,
            nextStep: options.nextStep,
            requiredData: options.requiredData,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    // Verificar que tenemos todos los datos necesarios
                    const missingData = options.requiredData.filter(field =>
                        !context.collectedData[field]
                    );

                    if (missingData.length > 0) {
                        return {
                            completed: false,
                            message: `Faltan datos para crear la reserva: ${missingData.join(', ')}`,
                            shouldSendMessage: false
                        };
                    }

                    // TODO: Implementar llamada real al servicio de reservas
                    // Por ahora simulamos la creación
                    const mockBooking = {
                        id: Math.floor(Math.random() * 10000),
                        date: context.collectedData.date,
                        time: context.collectedData.time,
                        service_type: context.collectedData.service_type,
                        customer_name: context.collectedData.customer_name,
                        status: 'confirmed',
                        created_at: new Date().toISOString()
                    };

                    return {
                        completed: true,
                        message: `¡Reserva confirmada! ID: ${mockBooking.id}\nFecha: ${mockBooking.date}\nHora: ${mockBooking.time}`,
                        shouldSendMessage: true,
                        data: {
                            booking: mockBooking,
                            booking_confirmed: true
                        }
                    };

                } catch (error) {
                    console.error(`Error en creación de reserva ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al crear reserva: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }

    /**
     * Crea un paso para consultar información del cliente
     */
    createCustomerLookupStep(options: {
        id: string;
        lookupBy: 'phone' | 'email' | 'id';
        nextStep?: string;
        createIfNotFound?: boolean;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Consulta de Información del Cliente',
            description: `Busca cliente por ${options.lookupBy}`,
            timeout: options.timeout || 5000,
            retries: 2,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    let lookupValue: string;

                    // Determinar el valor de búsqueda según el método
                    switch (options.lookupBy) {
                        case 'phone':
                            lookupValue = context.contact?.phone || context.message.from;
                            break;
                        case 'email':
                            // Extraer email del mensaje o datos recopilados
                            lookupValue = context.collectedData.email as string || '';
                            break;
                        case 'id':
                            lookupValue = context.collectedData.customer_id as string || '';
                            break;
                        default:
                            lookupValue = '';
                    }

                    if (!lookupValue) {
                        return {
                            completed: false,
                            error: `No se pudo determinar el valor de búsqueda para ${options.lookupBy}`
                        };
                    }

                    // TODO: Implementar llamada real al servicio de clientes
                    // Por ahora simulamos la búsqueda
                    const mockCustomer = {
                        id: 123,
                        name: 'Cliente Ejemplo',
                        email: 'cliente@ejemplo.com',
                        phone: lookupValue,
                        is_vip: false,
                        total_orders: 5,
                        last_order_date: '2024-01-15'
                    };

                    return {
                        completed: true,
                        data: {
                            customer_found: true,
                            customer: mockCustomer,
                            lookup_method: options.lookupBy,
                            lookup_value: lookupValue
                        }
                    };

                } catch (error) {
                    console.error(`Error en búsqueda de cliente ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error al buscar cliente: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }

    /**
     * Crea un paso genérico para llamadas HTTP a APIs externas
     */
    createHttpRequestStep(options: {
        id: string;
        url: string;
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        headers?: Record<string, string>;
        body?: Record<string, unknown>;
        expectedStatus?: number;
        responseMapper?: (response: unknown) => Record<string, unknown>;
        nextStep?: string;
        timeout?: number;
    }): StepDefinition {
        return {
            id: options.id,
            name: 'Llamada HTTP Externa',
            description: `${options.method} ${options.url}`,
            timeout: options.timeout || 10000,
            retries: 2,
            nextStep: options.nextStep,
            execute: async (context: StepContext): Promise<StepResult> => {
                try {
                    // TODO: Implementar llamada HTTP real
                    // Por ahora simulamos una respuesta exitosa
                    const mockResponse = {
                        status: 200,
                        data: { success: true, message: 'Operación completada' }
                    };

                    const expectedStatus = options.expectedStatus || 200;
                    if (mockResponse.status !== expectedStatus) {
                        return {
                            completed: false,
                            error: `Respuesta HTTP inesperada: ${mockResponse.status}`
                        };
                    }

                    const mappedData = options.responseMapper
                        ? options.responseMapper(mockResponse.data)
                        : mockResponse.data;

                    return {
                        completed: true,
                        data: {
                            http_response: mappedData,
                            http_status: mockResponse.status,
                            request_url: options.url,
                            request_method: options.method
                        }
                    };

                } catch (error) {
                    console.error(`Error en llamada HTTP ${options.id}:`, error);
                    return {
                        completed: false,
                        error: `Error en llamada HTTP: ${error instanceof Error ? error.message : 'Error desconocido'}`
                    };
                }
            }
        };
    }
}