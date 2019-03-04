import { StateInfo } from "./state-info.model";
import { StateHookType } from "../enums/state-lifecycle-hook-type.enum";
import { HookHandler } from "../types/hook-handler.type";

/**
 * The public APIs of the ISyncStateMachine
 */
export interface ISyncStateMachine<T> {

    /**
     * Performs a sync transition from the current state to the target state.
     * 
     * If during the evaluation of the transition an async hook is found an error is thrown.
     * In order transit in presence of async (Promise) hooks, use transitAsync() instead.
     * 
     * @param targetState The new state
     */
    transit(targetState: T): boolean;

    /**
     * Performs a sync transition from the current state to the first applicable state
     * of the transition with the specified name.
     * 
     * If multiple transition have the same name, the first applicable state
     * is is picked up traversing transitions in order of declaration.
     * 
     * If the transition has an array in "to" the first applicable state is is picked up.
     * 
     * If during the evaluation of the transition an async hook is found an error is thrown.
     * In order transit in presence of async (Promise) hooks, use transitByNameAsync() instead.
     * 
     * @param targetState The new state
     */
    transitByName(transitionName: string): boolean;

    /**
     * Performs a sync transition from the current state to the new state
     * without checking if it is possible. Events ans hooks of involved states will be invoked.
     * 
     * If during the evaluation of the transition an async hook is found an error is thrown.
     * In order transit in presence of async (Promise) hooks, use gotoAsync() instead.
     * 
     * @param newState The new state
     */
    goto(newState: T): boolean;
}