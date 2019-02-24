import {StateHookConfig} from './hook-config.model';

/**
 * The hook that will be called for a state
 */
export class HookFunction<T>{

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
    constructor(item: HookFunction<T>) {
        Object.assign(this, item);
    }
}