import { TypedStateMachine } from "../typed-state-machine";

/**
 * A transition event handler
 */
export type TransitionEventHandler<T> = (arg: TypedStateMachine<T>, from: T, to: T) => void;