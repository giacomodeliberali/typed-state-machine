import { StateInfo } from "./state-info.model";
import { StateHookType } from "../enums/state-lifecycle-hook-type.enum";
import { HookHandler } from "../types/hook-handler.type";
import { TransitOptions } from "./transit-options.interface";

/**
 * The public APIs of the AsyncStateMachine
 */
export interface IAsyncStateMachine<T> {

    /**
     * Initialize the machine and transit to the initial state 
     * invoking all registered hooks handlers
     */
    initializeAsync(options?: TransitOptions): Promise<IAsyncStateMachine<T>>;

    /**
     * Performs an async transition from the current state to the target state.
     * 
     * Can be used in both presence or absence of async hooks. If your hooks
     * are sync you can consider using transit() instead.
     * 
     * @param targetState The new state
     */
    transitAsync(targetState: T): Promise<boolean>;

    /**
     * Performs an async transition from the current state to the first applicable state
     * of the transition with the specified name.
     * 
     * If multiple transition have the same name, the first applicable state
     * is is picked up traversing transitions in order of declaration.
     * 
     * If the transition has an array in "to" the first applicable state is is picked up.
     * 
     * Can be used in both presence or absence of async hooks. If your hooks
     * are sync you can consider using transitByName() instead.
     * 
     * @param targetState The new state
     */
    transitByNameAsync(transitionName: string): Promise<boolean>;

    /**
     * Performs an async transition from the current state to the new state
     * without checking if it is possible. Events ans hooks of involved states will be invoked.
     * 
     * Can be used in both presence or absence of async hooks. If your hooks
     * are sync you can consider using goto() instead.
     * 
     * @param newState 
     */
    gotoAsync(newState: T): Promise<void>;
}