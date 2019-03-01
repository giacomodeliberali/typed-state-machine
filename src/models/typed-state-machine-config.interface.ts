import { Transition } from "./transition.model";
import { TypedStateMachine } from "../typed-state-machine";
import { StateHookBinding } from "./state-hook-binding.model";
import { GenericEventHandler } from "../types/generic-event-handler.type";
import { TransitionEventHandler } from "../types/transition-event-handler.type";
import { StateEventHandler } from "../types/state-event-handler.type";

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
    hooks?: StateHookBinding<T>[];

    /**
     * Fired before any transition
     */
    onBeforeEveryTransition?: GenericEventHandler<T>;

    /**
     * Fired after any transition
     */
    onAfterEveryTransition?: GenericEventHandler<T>;

    /**
     * Fired when an invalid transition is triggered from the current state
     */
    onInvalidTransition?: TransitionEventHandler<T>;

    /**
     * Fired when leaving any state
     */
    onStateLeave?: StateEventHandler<T>;

    /**
     * Fired when entering in any state
     */
    onStateEnter?: StateEventHandler<T>;
}