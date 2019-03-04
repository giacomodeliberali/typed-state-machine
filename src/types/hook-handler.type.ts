import { TypedStateMachine } from "../typed-state-machine";

/**
 * Represent a state hook function
 */
export type HookHandler<T> = (tsm: TypedStateMachine<T>) => boolean | Promise<boolean>;