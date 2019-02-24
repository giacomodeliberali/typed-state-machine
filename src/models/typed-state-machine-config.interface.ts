import { Transition } from "./transition.model";
import { TypedStateMachine } from "../typed-state-machine";
import { HookFunction } from "./hook-function.model";

/**
 * The initial configuration for the machine
 */
export interface TypedStateMachineConfig<T> {
    /**
     * The initial state of the machine
     */
    initialState: T;

    /**
     * The transition functions of the machine
     */
    transitions: Array<Transition<T>>;

    /**
     * Indicate if given any state, a transition from that state 
     * against itself is allowed or not
     */
    canSelfLoop?: boolean;

    /**
     * The specific state hooks used to manage state life cycle events 
     */
    hooks?: HookFunction<T>[];

    /**
     * Fired before any transition
     */
    onBeforeEveryTransition?: (arg: TypedStateMachine<T>) => void;

    /**
     * Fired after any transition
     */
    onAfterEveryTransition?: (arg: TypedStateMachine<T>) => void;

    /**
     * Fired when an invalid transition is triggered from the current state
     */
    onInvalidTransition?: (arg: TypedStateMachine<T>, from: T, to: T) => void;

    /**
     * Fired when leaving any state
     */
    onStateLeave?: (arg: TypedStateMachine<T>, state: T) => void;

    /**
     * Fired when entering in any state
     */
    onStateEnter?: (arg: TypedStateMachine<T>, state: T) => void;
}