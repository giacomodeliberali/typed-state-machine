import { TypedStateMachine } from "../typed-state-machine";

/**
 * A state event handler
 */
export type StateEventHandler<T> = (arg: TypedStateMachine<T>, state: T) => void;