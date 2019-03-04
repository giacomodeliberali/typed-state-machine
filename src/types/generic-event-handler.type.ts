import { TypedStateMachine } from "../typed-state-machine";

/**
 * A generic event handler
 */
export type GenericEventHandler<T> = (arg: TypedStateMachine<T>) => void;