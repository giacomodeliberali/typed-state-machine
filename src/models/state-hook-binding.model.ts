import {StateHookConfig} from './state-hook-config.model';

/**
 * The binding between a state and a list of hook handlers
 */
export class StateHookBinding<T>{

    /**
     * The state for this hook
     */
    state: T;

    /**
     * The list of handlers for this state
     */
    handlers: Array<StateHookConfig<T>>;

    /**
     * Create a new hook for a specific state
     * @param item The hook function configuration
     */
    constructor(item: StateHookBinding<T>) {
        Object.assign(this, item);
    }
}