import { State } from "./state.model";
import { StateHookType } from "./state-lifecycle-hook-type.enum";
import { TypedStateMachine } from "../typed-state-machine";

/**
 * The public APIs of the TypedStateMachine
 */
export interface ITypedStateMachine<T> {

    /**
     * Return the current state
     */
    getState(): T;

    /**
     * Return all the states involved at least in one transition
     */
    getAllStates(): Array<State<T>>;

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
     * Performs a sync transition from the current state to the target state.
     * 
     * If during the evaluation of the transition an async hook is found an error is thrown.
     * In order transit in presence of async (Promise) hooks, use transitAsync() instead.
     * 
     * @param targetState The new state
     */
    transit(targetState: T): boolean;

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
     * Performs a sync transition from the current state to the new state
     * without checking if it is possible. Events ans hooks of involved states will be invoked.
     * 
     * If during the evaluation of the transition an async hook is found an error is thrown.
     * In order transit in presence of async (Promise) hooks, use gotoAsync() instead.
     * 
     * @param newState The new state
     */
    goto(newState: T): boolean;

    /**
     * Performs an async transition from the current state to the new state
     * without checking if it is possible. Events ans hooks of involved states will be invoked.
     * 
     * Can be used in both presence or absence of async hooks. If your hooks
     * are sync you can consider using goto() instead.
     * 
     * @param newState 
     */
    gotoAsync(newState: T): Promise<boolean>;

    /**
     * Add a new hook handler in the specified state and hook type.
     * 
     * If an hook already exist with the same combination of state and hookType it will be replaced.
     * 
     * @param applyTo The state associated to this hook
     * @param hookType The hook type
     * @param handler The executed handler
     */
    bindHook(applyTo: T | Array<T>, hookType: StateHookType | Array<StateHookType>, handler: (tsm: TypedStateMachine<T>) => boolean | Promise<boolean>): void;

}