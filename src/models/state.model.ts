/**
 * A state of the machine
 */
export class State<T> {
    /**
     * The state
     */
    state: T;

    /**
     * Indicate if this state is reachable from the current state
     */
    reachable: boolean;

    /**
     * Indicates if this state is the current one
     */
    current: boolean;

    /**
     * Create a new state
     * @param item The state configuration
     */
    constructor(item: Partial<State<T>>) {
        Object.assign(this, item);
    }
}