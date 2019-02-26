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
    private _state: T;

    /**
     * The initial configuration
     */
    private _config: TypedStateMachineConfig<T>;

    /**
     * Returns the current machine configuration
     */
    public get config() {
        return Object.assign({}, this._config);
    }

    /**
     * Overwrite the given configuration. 
     * 
     * Update only specified properties.
     * 
     * @param config The new configuration properties to overwrite
     */
    public updateConfig(config: Partial<TypedStateMachineConfig<T>>) {
        Object.assign(this._config, config)
    }

    /**
     * Create a new TypedStateMachine
     * @param config The configuration such as transition functions and initial state
     */
    constructor(config: TypedStateMachineConfig<T>) {
        this._config = {
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

        if (this._config.onBeforeEveryTransition)
            this._config.onBeforeEveryTransition(this);

        const canProceed = await this.triggerHooks(this._config.initialState, StateHookType.OnBeforeEnter);
        if (canProceed) {

            if (this._config.onStateEnter)
                this._config.onStateEnter(this, this._config.initialState);

            this._state = this._config.initialState;

            await this.triggerHooks(this._state, StateHookType.OnAfterEnter);

            if (this._config.onAfterEveryTransition)
                this._config.onAfterEveryTransition(this);
        }

        return this;
    }

    /**
     * Return the current configuration of the machine
     */
    public getConfig() {
        return Object.assign({}, this._config);
    }

    /**
     * Return the current internal state of the machine
     */
    public getState(): T {
        return this._state;
    }

    /**
     * Return all the current transition functions
     */
    public getAllTransitions(): Array<Transition<T>> {
        return this._config.transitions.slice();
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
        this._config.transitions.forEach(transition => {
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
    private getHooksOfState(targetState: T): Array<HookFunction<T>> {
        const hooks: Array<HookFunction<T>> = [];

        this._config.hooks.forEach(configuredHook => {
            if (configuredHook.state == targetState)
                hooks.push(configuredHook);
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
     * Make a transition from the current state to the first applicable state
     * of the transition with the specified name.
     * 
     * If multiple transition have the same name, the first applicable state
     * is is picked up traversing transitions in order of declaration.
     * 
     * If the transition has an array in "to" the first applicable state is is picked up.
     * 
     * @param transitionName The target transition name
     */
    public async transitByName(transitionName: string): Promise<boolean> {

        const transitions = this.config.transitions.filter(t => t.name == transitionName);

        if (!transitions || transitions.length == 0) {
            throw new Error("The supplied transition name does not exist");
        }

        let targetTransition: Transition<T> = transitions.find(t => {
            if (Array.isArray(t.to)) {
                return !!t.to.find(toState => this.can(toState));
            } else {
                return this.can(t.to)
            }
        });

        if (!targetTransition) {
            if (this._config.onInvalidTransition)
                this.config.onInvalidTransition(this, this._state, undefined);
            return Promise.resolve(false);
        }

        let newState: T = null;

        if (Array.isArray(targetTransition.to)) {
            newState = targetTransition.to.find(target => {
                return this.can(target);
            });
        } else {
            newState = targetTransition.to;
        }


        return this._transit(targetTransition, newState);
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
     *  - OnAfterLeave [state]
     *  - OnBeforeEnter [state]
     *  - onStateEnter
     *  - OnAfterEnter [state]
     *  - onAfterTransition
     *  - onAfterEveryTransition
     * 
     * During this transition all life cycles events will be triggered.
     * @param newState The destination state
     */
    public async transit(newState: T): Promise<boolean> {
        let transition = this.getTransition(newState);

        if (!transition && (newState != null && newState != undefined) && this._config.canSelfLoop) {
            // self transition
            transition = new Transition({
                from: newState,
                to: newState
            })
        }

        return this._transit(transition, newState);
    }

    /**
     * Changes the state of the machine 
     * @param transition The transition that eventually contains the hooks to invoke
     * @param newState The new state to reach
     * @param options The options to ignore hooks or events
     */
    private async _transit(transition: Transition<T>, newState: T, options?: TransitOptions): Promise<boolean> {

        if (newState == null || newState == undefined) {
            throw new Error("Cannot transit to invalid state!");
        }

        // update default options
        options = Object.assign({
            ignoreHooksResults: false,
            invokeHooks: true,
            fireEvents: true
        } as TransitOptions, options || {});

        if (transition) {

            if (options.fireEvents && this._config.onBeforeEveryTransition)
                this._config.onBeforeEveryTransition(this);

            if (options.fireEvents && transition.onBeforeTransition)
                transition.onBeforeTransition(this);

            if (options.invokeHooks) {
                let canProceed = await this.triggerHooks(this._state, StateHookType.OnBeforeLeave);
                if (!options.ignoreHooksResults && !canProceed)
                    return false;
            }

            if (options.fireEvents && this._config.onStateLeave)
                this._config.onStateLeave(this, this._state);

            // just left old status
            const oldState = this._state;

            // status is undefined now
            this._state = undefined;

            if (options.invokeHooks) {
                let canProceed = await this.triggerHooks(oldState, StateHookType.OnAfterLeave);
                if (!options.ignoreHooksResults && !canProceed)
                    return false;
            }

            if (options.invokeHooks) {
                let canProceed = await this.triggerHooks(newState, StateHookType.OnBeforeEnter);
                if (!options.ignoreHooksResults && !canProceed)
                    return false;
            }

            // update the state
            this._state = newState;

            // fire event
            if (this._config.onStateEnter)
                this._config.onStateEnter(this, this._state);

            if (options.invokeHooks) {
                let canProceed = await this.triggerHooks(this._state, StateHookType.OnAfterEnter);
                if (!options.ignoreHooksResults && !canProceed)
                    return false;
            }

            if (options.fireEvents && transition.onAfterTransition)
                transition.onAfterTransition(this);


            if (options.fireEvents && this._config.onAfterEveryTransition)
                this._config.onAfterEveryTransition(this);

            return true;

        } else {
            // on invalid transition
            if (options.fireEvents && this._config.onInvalidTransition)
                this._config.onInvalidTransition(this, this._state, newState);

        }
        return false;
    }

    /**
     * Return a transition from the current state to the newState, if it exists.
     * 
     * Return null if the transition does not exist
     * 
     * @param newState The new state
     */
    private getTransition(newState: T): Transition<T> {
        let toRet: Transition<T> = null;
        this._config.transitions.forEach(transition => {
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

        if (this._config.canSelfLoop && newState == this.getState())
            return true;

        return !!this.getTransition(newState);
    }

    /**
     * Perform a transition from the current state to the given new state (without checking at the given transitions).
     * 
     * During this transition all life cycles events will be triggered.
     * 
     * @param newState The destination state
     */
    public async goto(newState: T): Promise<void> {
        let transition = this.getTransition(newState);

        if (!transition) {
            // not existing transition, so no hooks
            transition = new Transition({
                from: this._state,
                to: newState
            })
        }

        await this._transit(transition, newState, {
            ignoreHooksResults: true
        });

    }
}

interface TransitOptions {
    /**
     * Indicate if the current transition should invoke events on transitions:
     * 
     *  - onBeforeEveryTransition
     *  - onBeforeTransition
     * 
     *  - onStateLeave
     *  - onStateEnter
     * 
     *  - onAfterTransition
     *  - onAfterEveryTransition
     * 
     *  - onInvalidTransition
     */

    fireEvents?: boolean;

    /**
     * Indicate if the current transition should invoke hooks on states:
     * 
     *  - OnBeforeLeave
     *  - OnAfterLeave 
     *  - OnBeforeEnter
     *  - OnAfterEnter
     */
    invokeHooks?: boolean;

    /**
     * Indicate if the current transition should invoke but ignore
     * results of hooks on states:
     * 
     *  - OnBeforeLeave
     *  - OnAfterLeave 
     *  - OnBeforeEnter
     *  - OnAfterEnter
     */
    ignoreHooksResults?: boolean;
}