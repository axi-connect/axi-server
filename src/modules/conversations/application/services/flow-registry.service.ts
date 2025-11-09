import { FlowDefinition, StepDefinition } from '../../domain/interfaces/workflow.interface.js';

/**
 * Servicio de registro central para definiciones de flujo
 * Gestiona el registro, validación y recuperación de flujos por pasos
*/
export class FlowRegistryService {
    private readonly flows = new Map<string, FlowDefinition>();

    /**
     * Registra una definición de flujo
    */
    registerFlow(flow: FlowDefinition): void {
        this.validateFlowDefinition(flow);
        this.flows.set(flow.name, flow);
        console.log(`Flujo registrado: ${flow.name} (v${flow.version || '1.0'})`);
    }

    /**
     * Registra múltiples flujos
    */
    registerFlows(flows: FlowDefinition[]): void {
        for (const flow of flows) {
            this.registerFlow(flow);
        }
    }

    /**
     * Verifica si un flujo está registrado
    */
    hasFlow(flowName: string): boolean {
        return this.flows.has(flowName);
    }

    /**
     * Obtiene una definición de flujo por nombre
    */
    getFlow(flowName: string): FlowDefinition | null {
        const flow = this.flows.get(flowName);
        if (!flow) return null;

        return flow;
    }

    /**
     * Lista todos los flujos registrados
    */
    listFlows(): FlowDefinition[] {
        return Array.from(this.flows.values());
    }

    /**
     * Lista nombres de flujos registrados
    */
    listFlowNames(): string[] {
        return Array.from(this.flows.keys());
    }

    /**
     * Elimina un flujo del registro
    */
    unregisterFlow(flowName: string): boolean {
        const existed = this.flows.delete(flowName);
        if (existed) console.log(`Flujo eliminado: ${flowName}`);
        return existed;
    }

    /**
     * Limpia todos los flujos registrados
    */
    clear(): void {
        this.flows.clear();
        console.log('Registro de flujos limpiado');
    }

    /**
     * Obtiene estadísticas del registro
    */
    getStats(): { totalFlows: number; flowNames: string[] } {
        return {
            totalFlows: this.flows.size,
            flowNames: this.listFlowNames()
        };
    }

    /**
     * Valida una definición de flujo completa
    */
    private validateFlowDefinition(flow: FlowDefinition): void {
        if (!flow.name || typeof flow.name !== 'string') throw new Error('La definición del flujo debe tener un nombre válido');
        if (!flow.initialStep || typeof flow.initialStep !== 'string') throw new Error(`Flujo '${flow.name}': debe tener un paso inicial válido`);
        if (!Array.isArray(flow.steps) || flow.steps.length === 0) throw new Error(`Flujo '${flow.name}': debe tener al menos un paso definido`);

        // Validar que el paso inicial existe
        const initialStepExists = flow.steps.some(step => step.id === flow.initialStep);
        if (!initialStepExists) throw new Error(`Flujo '${flow.name}': el paso inicial '${flow.initialStep}' no existe en los pasos definidos`);

        // Validar cada paso individualmente
        const stepIds = new Set<string>();
        for (const step of flow.steps) {
            this.validateStepDefinition(step, flow.name);

            // Verificar IDs únicos
            if (stepIds.has(step.id)) throw new Error(`Flujo '${flow.name}': ID de paso duplicado '${step.id}'`);
            stepIds.add(step.id);
        }
    }

    /**
     * Valida una definición de paso individual
    */
    private validateStepDefinition(step: StepDefinition, flowName: string): void {
        if (!step.id || typeof step.id !== 'string') throw new Error(`Flujo '${flowName}': paso debe tener un ID válido`);
        if (!step.name || typeof step.name !== 'string') throw new Error(`Flujo '${flowName}': paso '${step.id}' debe tener un nombre válido`);
        if (typeof step.execute !== 'function') throw new Error(`Flujo '${flowName}': paso '${step.id}' debe tener una función execute válida`);
        // Validar timeout si está definido
        if (step.timeout !== undefined && (typeof step.timeout !== 'number' || step.timeout <= 0)) {
            throw new Error(`Flujo '${flowName}': paso '${step.id}' tiene timeout inválido`);
        }

        // Validar retries si está definido
        if (step.retries !== undefined && (typeof step.retries !== 'number' || step.retries < 0)) {
            throw new Error(`Flujo '${flowName}': paso '${step.id}' tiene retries inválido`);
        }

        // Validar requiredData si está definido
        if (step.requiredData !== undefined && !Array.isArray(step.requiredData)) {
            throw new Error(`Flujo '${flowName}': paso '${step.id}' tiene requiredData inválido`);
        }
    }
}