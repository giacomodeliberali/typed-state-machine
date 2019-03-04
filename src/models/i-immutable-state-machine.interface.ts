import { StateInfo } from "./state-info.model";
import { StateHookType } from "../enums/state-lifecycle-hook-type.enum";
import { HookHandler } from "../types/hook-handler.type";

/**
 * The public APIs of the IStateMachine
 */
export interface IImmutableStateMachine<T> {

    /**
     * Return the current state
     */
    getState(): T;

    /**
     * Return all the states involved at least in one transition
     */
    getAllStates(): Array<StateInfo<T>>;

    /**
     * Return true if a transition exist from the current state to the new state, false otherwise
     * @param newState The new state
     */
    can(newState: T): boolean;

    /**
     * Return the reachable states from the current one
     */
    getNextStates(): Array<T>;


    /**
     * Add a new hook handler in the specified state and hook type.
     * 
     * If an hook already exist with the same combination of state and hookType it will be replaced.
     * 
     * @param applyToStates The state associated to this hook
     * @param hookType The hook type
     * @param handler The executed handler
     */
    bindHookHandler(applyToStates: T | Array<T>, hookType: StateHookType, handler: HookHandler<T>): void;
}