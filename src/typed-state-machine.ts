import { Transition } from "./models/transition.model";
import { StateHookType } from "./models/state-lifecycle-hook-type.enum";
import { HookFunction } from "./models/hook-function.model";
import { State } from "./models/state.model";
import { TypedStateMachineConfig } from "./models/typed-state-machine-config.interface";

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
            transitions: config.transitions.slice(),
            hooks: config.hooks ? config.hooks.slice() : [],
            onAfterEveryTransition: config.onAfterEveryTransition,
            onBeforeEveryTransition: config.onBeforeEveryTransition,
            onInvalidTransition: config.onInvalidTransition,
            onStateEnter: config.onStateEnter,
            onStateLeave: config.onStateLeave
        }
    }

    /**
     * Initialize the machine with the initial state and invokes the registered hooks
     */
    public async initialize() {
        // initial life cycle events

        if (this.config.onBeforeEveryTransition)
            this.config.onBeforeEveryTransition(this);

        const canProceed = await this.triggerHooks(this.config.initialState, StateHookType.OnBeforeEnter);
        if (canProceed) {

            if (this.config.onStateEnter)
                this.config.onStateEnter(this, this.config.initialState);

            this.state = this.config.initialState;

            await this.triggerHooks(this.state, StateHookType.OnAfterEnter);

            if (this.config.onAfterEveryTransition)
                this.config.onAfterEveryTransition(this);
        }

        return this;
    }

    /**
     * Return the current configuration of the machine
     */
    public getConfig() {
        return Object.assign({}, this.config);
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
                        reachable: reachable || this.can(from),
                        current: from == this.getState()
                    }));
                });
            } else {
                const existing = states.has(transition.from) ? states.get(transition.from) : null;
                const reachable = existing ? existing.reachable : false;
                states.set(transition.from, new State({
                    state: transition.from,
                    reachable: reachable || this.can(transition.from),
                    current: transition.from == this.getState()
                }));
            }

            if (Array.isArray(transition.to)) {
                transition.to.forEach(to => {
                    const existing = states.has(to) ? states.get(to) : null;
                    const reachable = existing ? existing.reachable : false;
                    states.set(to, new State({
                        state: to,
                        reachable: reachable || this.can(to),
                        current: to == this.getState()
                    }));
                });
            } else {
                const existing = states.has(transition.to) ? states.get(transition.to) : null;
                const reachable = existing ? existing.reachable : false;
                states.set(transition.to, new State({
                    state: transition.to,
                    reachable: reachable || this.can(transition.to),
                    current: transition.to == this.getState()
                }));
            }
        });
        return Array.from(states.values());
    }

    /**
     * Returns all the hooks of a given state
     * @param targetState The state of which you want to obtain the hooks
     */
    private getHooksOfState(targetState: T | Array<T>): Array<HookFunction<T>> {
        const hooks: Array<HookFunction<T>> = [];

        this.config.hooks.forEach(configuredHook => {
            if (Array.isArray(targetState)) {
                targetState.forEach(state => {
                    if (state == configuredHook.state)
                        hooks.push(configuredHook);
                });
            } else {
                if (configuredHook.state == targetState)
                    hooks.push(configuredHook);
            }
        });

        return hooks;
    }

    /**
     * Execute all the specified hooks af a given state
     * @param state The state of which you want to execute the hooks
     * @param hookType The hook type that you want to execute
     */
    private async triggerHooks(state: T, hookType: StateHookType): Promise<boolean> {

        const hooks: Array<HookFunction<T>> = this.getHooksOfState(state);
        const resolvers: Array<Promise<boolean>> = [];
        let okFlag = true;

        hooks.forEach(hooks => {
            hooks.handlers.forEach(handlerConfig => {
                if (handlerConfig.hookType == hookType) {
                    const result = handlerConfig.handler(this);
                    if (result instanceof Promise) {
                        resolvers.push(result);
                    } else {
                        okFlag = okFlag && result;
                    }
                }
            });
        });

        const okFlagPromise = await Promise.all(resolvers);

        return okFlag && okFlagPromise.reduce((acc, value) => { return value && acc }, true);
    }

    /**
     * Perform a transition from the current state to the given new state, if possible.
     * If the transition is not possible return false, true if the transition succeeded.
     * 
     * Lifecycle events:
     *  - onBeforeEveryTransition
     *  - onBeforeTransition
     *  - OnBeforeLeave [state]
     *  - onStateLeave
     *  - OnAfterLeave
     *  - OnBeforeEnter [state]
     *  - onStateEnter
     *  - OnAfterEnter
     *  - onAfterTransition
     *  - onAfterEveryTransition
     * 
     * During this transition all life cycles events will be triggered.
     * @param newState The destination state
     */
    public async transit(newState: T): Promise<boolean> {
        const transition = this.getTransition(newState);
        if (transition) {

            // on before transition
            // on before leave
            // on after leave
            // on before enter
            // on after enter
            // on after transition

            if (this.config.onBeforeEveryTransition)
                this.config.onBeforeEveryTransition(this);


            if (transition.onBeforeTransition)
                transition.onBeforeTransition(this);

            const executeHandles = (hooks: Array<HookFunction<T>>, hookType: StateHookType) => {
                hooks.forEach(hook => {
                    hook.handlers.forEach(handlerConfig => {
                        if (handlerConfig.hookType == hookType)
                            handlerConfig.handler(this);
                    });
                });
            };

            const fromHooks: Array<HookFunction<T>> = this.getHooksOfState(transition.from);
            const toHooks: Array<HookFunction<T>> = this.getHooksOfState(transition.to);

            executeHandles(fromHooks, StateHookType.OnBeforeLeave);

            if (this.config.onStateLeave)
                this.config.onStateLeave(this, this.state);

            this.state = null;

            executeHandles(fromHooks, StateHookType.OnAfterLeave);

            executeHandles(toHooks, StateHookType.OnBeforeEnter);

            this.state = newState;

            if (this.config.onStateEnter)
                this.config.onStateEnter(this, this.state);

            executeHandles(toHooks, StateHookType.OnAfterEnter);

            if (transition.onAfterTransition)
                transition.onAfterTransition(this);


            if (this.config.onAfterEveryTransition)
                this.config.onAfterEveryTransition(this);

        } else {
            // on invalid transition

            if (this.config.onInvalidTransition)
                this.config.onInvalidTransition(this, this.getState(), newState);

        }
        return false;
    }

    private getTransition(newState: T): Transition<T> {
        let toRet: Transition<T> = null;
        this.config.transitions.forEach(transition => {
            if (Array.isArray(transition.from)) {
                if (transition.from.find(s => s == this.getState())) {
                    if (Array.isArray(transition.to)) {
                        // [A,B,C] -> [D,E,F]
                        const tr = transition.to.find(s => s == newState);
                        if (tr)
                            toRet = transition;
                    } else {
                        // [A,B,C] -> D
                        if (transition.to == newState)
                            toRet = transition;
                    }
                }
            } else {
                if (transition.from == this.getState()) {
                    if (Array.isArray(transition.to)) {
                        // A -> [B,C,D]
                        const tr = transition.to.find(s => s == newState)
                        if (tr)
                            toRet = transition;
                    } else {
                        // A -> B
                        if (transition.to == newState)
                            toRet = transition;
                    }
                }
            }
        });
        return toRet;
    }

    /**
     * If the transition from the current state is not possible return false, true otherwise. 
     * @param newState The destination state
     */
    public can(newState: T): boolean {

        if (this.config.canSelfLoop && newState == this.getState())
            return true;

        return !!this.getTransition(newState);
    }

    /**
     * Perform a transition from the current state to the given new state (without checking at the given transitions).
     * 
     * During this transition all life cycles events will be triggered.
     * @param newState The destination state
     */
    public goto(newState: T): boolean {
        throw new Error("To be implemented");
    }
}