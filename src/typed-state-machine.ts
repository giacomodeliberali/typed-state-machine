import { Transition } from "./models/transition.model";

/**
 * A strongly typed state machine inspired by finite-state-machine
 */
export class TypedStateMachine<T> {

    /**
     * The current internal state
     */
    private state: T;

    /**
     * The initial configuration
     */
    private config: TypedStateMachineConfig<T>;

    /**
     * Create a new TypedStateMachine
     * @param config The configuration such as transition functions and initial state
     */
    constructor(config: TypedStateMachineConfig<T>) {
        this.config = {
            canSelfLoop: config.canSelfLoop || false,
            initialState: config.initialState,
            transitions: config.transitions.slice()
        }
        this.state = this.config.initialState;
    }

    /**
     * Indicate if a transition from the current state to the current state is allowed or not
     */
    public get canSelfLoop() {
        return this.config.canSelfLoop
    }

    /**
     * Return the current internal state of the machine
     */
    public getState(): T {
        return this.state;
    }

    /**
     * Return all the current transition functions
     */
    public getAllTransitions(): Array<Transition<T>> {
        return this.config.transitions.slice();
    }

    /**
     * Returns the states that are reachable from the current state
     */
    public getNextStates(): Array<T> {
        return this.getAllStates()
            .filter(s => s.reachable)
            .map(s => s.state);
    }

    /**
     * Return all the state of the machine with an extra indicator
     * that indicates if they are reachable from current state
     */
    public getAllStates(): Array<State<T>> {
        const states = new Map<T, State<T>>();
        this.config.transitions.forEach(transition => {
            if (Array.isArray(transition.from)) {
                transition.from.forEach(from => {
                    const existing = states.has(from) ? states.get(from) : null;
                    const reachable = existing ? existing.reachable : false;
                    states.set(from, new State({
                        state: from,
                        reachable: reachable || this.can(from)
                    }));
                });
            } else {
                const existing = states.has(transition.from) ? states.get(transition.from) : null;
                const reachable = existing ? existing.reachable : false;
                states.set(transition.from, new State({
                    state: transition.from,
                    reachable: reachable || this.can(transition.from)
                }));
            }

            if (Array.isArray(transition.to)) {
                transition.to.forEach(to => {
                    const existing = states.has(to) ? states.get(to) : null;
                    const reachable = existing ? existing.reachable : false;
                    states.set(to, new State({
                        state: to,
                        reachable: reachable || this.can(to)
                    }));
                });
            } else {
                const existing = states.has(transition.to) ? states.get(transition.to) : null;
                const reachable = existing ? existing.reachable : false;
                states.set(transition.to, new State({
                    state: transition.to,
                    reachable: reachable || this.can(transition.to)
                }));
            }
        });
        return Array.from(states.values());
    }

    /**
     * Perform a transition from the current state to the given new state, if possible.
     * If the transition is not possible return false, true if the transition succeeded.
     * 
     * During this transition all life cycles events will be triggered.
     * @param newState The destination state
     */
    public transit(newState: T): boolean {
        return false;
    }

    /**
     * If the transition from the current state is not possible return false, true otherwise. 
     * @param newState The destination state
     */
    public can(newState: T): boolean {
        let reachable = false;
        this.config.transitions.forEach(transition => {
            if (Array.isArray(transition.from)) {
                if (transition.from.find(s => s == this.getState())) {
                    if (Array.isArray(transition.to)) {
                        // [A,B,C] -> [D,E,F]
                        if (transition.to.find(s => s == newState))
                            reachable = true;
                    } else {
                        // [A,B,C] -> D
                        if (transition.to == newState)
                            reachable = true;
                    }
                }
            } else {
                if (transition.from == this.getState()) {
                    if (Array.isArray(transition.to)) {
                        // A -> [B,C,D]
                        if (transition.to.find(s => s == newState))
                            reachable = true;
                    } else {
                        // A -> B
                        if (transition.to == newState)
                            reachable = true;
                    }
                }
            }
        });



        if (this.config.canSelfLoop && newState == this.getState())
            return true;

        return reachable;
    }

    /**
     * Perform a transition from the current state to the given new state (without checking at the given transitions).
     * 
     * During this transition all life cycles events will be triggered.
     * @param newState The destination state
     */
    public goto(newState: T): void {

    }



}

export class State<T> {
    state: T;
    reachable: boolean;

    constructor(item?: Partial<State<T>>) {
        if (item)
            Object.assign(this, item);
    }
}

export interface TypedStateMachineConfig<T> {
    initialState: T;
    transitions: Array<Transition<T>>;
    canSelfLoop?: boolean;
}