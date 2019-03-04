import { Transition } from "./models/transition.model";
import { StateHookType } from "./enums/state-lifecycle-hook-type.enum";
import { StateInfo } from "./models/state-info.model";
import { TypedStateMachineConfig } from "./models/typed-state-machine-config.interface";
import { TransitOptions } from "./models/transit-options.interface";
import { EventsBuilder } from "./helpers/events-builder.helper";
import { IAsyncStateMachine } from "./models/i-async-state-machine.interface";
import { HookHandler } from "./types/hook-handler.type";
import { IImmutableStateMachine } from "./models/i-immutable-state-machine.interface";

/**
 * A strongly typed state machine inspired by finite-state-machine
 */
export class TypedStateMachine<T> implements IAsyncStateMachine<T>, IImmutableStateMachine<T>{

    /**
     * The current internal state
     */
    private _state: T;

    /**
     * Indicate is a transition is pending
     */
    private _isTransitionPending: boolean;

    public isPending() {
        return this._isTransitionPending;
    }

    /**
     * The initial configuration
     */
    private _config: TypedStateMachineConfig<T>;

    /**
     * The default transit options
     */
    private readonly _defaultTransitOptions: TransitOptions = {
        fireEvents: true,
        ignoreHooksResults: false,
        invokeHooks: true
    }

    /**
     * Indicate if the current instance is initialized or not
     */
    private _isInitialized: boolean;

    /**
     * Return the current configuration of the machine
     */
    public getConfig() {
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

        if (!config)
            throw new Error("A configuration is required to build a new TypedStateMachine");

        if (config.initialState == undefined || config.initialState == null)
            throw new Error("An initial state is required to initialize a new TypedStateMachine");

        this._config = {
            // Initialization
            initialState: config.initialState,
            transitions: config.transitions ? config.transitions.slice() : [],
            hooks: config.hooks ? config.hooks.slice() : [],

            // Options
            canSelfLoop: config.canSelfLoop || false,

            // Events
            onAfterEveryTransition: config.onAfterEveryTransition,
            onBeforeEveryTransition: config.onBeforeEveryTransition,
            onInvalidTransition: config.onInvalidTransition,
            onStateEnter: config.onStateEnter,
            onStateLeave: config.onStateLeave
        }

        this._isInitialized = false;
    }

    /**
     * Initialize the machine with the initial state and invokes the registered hooks
     */
    public async initializeAsync(options?: TransitOptions): Promise<TypedStateMachine<T>> {

        if (this._isInitialized)
            throw new Error("The machine is already initialized and cannot be reinitialized twice.");

        // ensure correct options
        options = Object.assign({}, this._defaultTransitOptions, options || {});

        EventsBuilder
            .bind(this._config.onBeforeEveryTransition)
            .toArgs(this)
            .fireIf(options.fireEvents);

        if (options.invokeHooks) {
            const canProceed = await this.invokeHook(this._config.initialState, StateHookType.OnBeforeEnter);
            if (!canProceed && !options.ignoreHooksResults)
                throw new Error(`The hook ${StateHookType[StateHookType.OnBeforeEnter]} of state ${this._config.initialState} returned value "${canProceed}", that prevented the machine to be initialized properly. This value should be "true | Promise<true>"`);
        }

        // set initial state
        this._state = this._config.initialState;

        EventsBuilder
            .bind(this._config.onStateEnter)
            .toArgs(this, this._config.initialState)
            .fireIf(options.fireEvents);


        if (options.invokeHooks) {
            const canProceed = await this.invokeHook(this._state, StateHookType.OnAfterEnter);
            if (!canProceed && !options.ignoreHooksResults)
                console.warn(`The hook ${StateHookType[StateHookType.OnAfterEnter]} of state ${this._state} returned => ${canProceed}`);
        }

        EventsBuilder
            .bind(this._config.onAfterEveryTransition)
            .toArgs(this)
            .fireIf(options.fireEvents);

        this._isTransitionPending = false;

        // mark as initialized
        this._isInitialized = true;

        return this;
    }

    /**
     * Mark the _isTransitionPending to true
     */
    private _beginTransition() {
        this._isTransitionPending = true;
    }

    /**
     * Mark the _isTransitionPending to false
     */
    private _endTransition() {
        this._isTransitionPending = false;
    }

    /**
     * Throw if this instance is not initialized
     */
    private throwIfNotInitialized() {
        if (!this._isInitialized)
            throw new Error("The machine has not been initialized yet. After construction enure initialize() has been called before any other operation.");
    }

    /**
     * Return the current internal state of the machine.
     * 
     * Throws an error if there is a pending transition
     */
    public getState(): T {
        this.throwIfNotInitialized();

        if (this._isTransitionPending)
            throw new Error("A transition is pending. Before getting the state await his completeness");

        return this._state;
    }

    /**
     * Return all the current transition functions
     */
    public getAllTransitions(): Array<Transition<T>> {
        this.throwIfNotInitialized();
        return this._config.transitions.slice();
    }

    /**
     * Returns the states that are reachable from the current state
     */
    public getNextStates(): Array<T> {
        this.throwIfNotInitialized();
        return this.getAllStates()
            .filter(s => s.reachable)
            .map(s => s.state);
    }

    /**
     * Return all the state of the machine with an extra indicator
     * that indicates if they are reachable from current state
     */
    public getAllStates(): Array<StateInfo<T>> {

        this.throwIfNotInitialized();

        // TODO: refactor this ugly code

        const states = new Map<T, StateInfo<T>>();
        this._config.transitions.forEach(transition => {
            if (Array.isArray(transition.from)) {
                transition.from.forEach(from => {
                    const existing = states.has(from) ? states.get(from) : null;
                    const reachable = existing ? existing.reachable : false;
                    states.set(from, new StateInfo({
                        state: from,
                        reachable: reachable || this.can(from),
                        current: from == this.getState()
                    }));
                });
            } else {
                const existing = states.has(transition.from) ? states.get(transition.from) : null;
                const reachable = existing ? existing.reachable : false;
                states.set(transition.from, new StateInfo({
                    state: transition.from,
                    reachable: reachable || this.can(transition.from),
                    current: transition.from == this.getState()
                }));
            }

            if (Array.isArray(transition.to)) {
                transition.to.forEach(to => {
                    const existing = states.has(to) ? states.get(to) : null;
                    const reachable = existing ? existing.reachable : false;
                    states.set(to, new StateInfo({
                        state: to,
                        reachable: reachable || this.can(to),
                        current: to == this.getState()
                    }));
                });
            } else {
                const existing = states.has(transition.to) ? states.get(transition.to) : null;
                const reachable = existing ? existing.reachable : false;
                states.set(transition.to, new StateInfo({
                    state: transition.to,
                    reachable: reachable || this.can(transition.to),
                    current: transition.to == this.getState()
                }));
            }
        });
        return Array.from(states.values());
    }

    /**
     * Execute the first hook that matches the target state and the hookType
     * @param targetState The state of which you want to execute the hook
     * @param hookType The hook type that you want to execute
     */
    private invokeHook(targetState: T, hookType: StateHookType) {

        const stateHooks = this._config.hooks
            .find(configuredHook => configuredHook.state == targetState);

        if (stateHooks && stateHooks.handlers) {
            const hookFunction = stateHooks.handlers.find(h => h.hookType == hookType);
            if (hookFunction && typeof hookFunction.handler == "function")
                return hookFunction.handler.call(undefined, this);
        }

        return true;
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
    public async transitByNameAsync(transitionName: string, options?: TransitOptions): Promise<boolean> {

        this.throwIfNotInitialized();

        const transitions = this._config.transitions.filter(t => t.name == transitionName);

        if (!transitions || transitions.length == 0)
            throw new Error("The supplied transition name does not exist");

        // ensure correct options
        options = Object.assign({}, this._defaultTransitOptions, options || {});

        let targetTransition: Transition<T> = transitions.find(t => {
            if (Array.isArray(t.to)) {
                return !!t.to.find(toState => this.can(toState));
            } else {
                return this.can(t.to)
            }
        });

        if (!targetTransition) {
            EventsBuilder
                .bind(this._config.onInvalidTransition)
                .toArgs(this, this._state, undefined)
                .fireIf(options.fireEvents);

            return false;
        }

        let newState: T = null;

        if (Array.isArray(targetTransition.to)) {
            newState = targetTransition.to.find(target => {
                return this.can(target);
            });
        } else {
            newState = targetTransition.to;
        }

        return this._transitAsync(targetTransition, newState);
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
    public async transitAsync(newState: T): Promise<boolean> {

        this.throwIfNotInitialized();

        let transition = this.getTransition(newState);

        if (!transition && this._config.canSelfLoop && this.isSelfLoop(newState)) {
            // create a new runtime transition to emulate the self loop
            transition = new Transition({
                from: newState,
                to: newState
            })
        }

        return this._transitAsync(transition, newState);
    }

    /**
     * Return true if the transition to the target state is a self loop from the current state or not.
     * @param newState The target state
     */
    public isSelfLoop(newState: T): boolean {
        let transition = this.getTransition(newState);
        return !transition && newState != null && newState != undefined && newState == this._state;
    }

    /**
     * Changes the state of the machine 
     * @param transition The transition that eventually contains the hooks to invoke
     * @param newState The new state to reach
     * @param options The options to ignore hooks or events
     */
    private async _transitAsync(transition: Transition<T>, newState: T, options?: TransitOptions): Promise<boolean> {

        if (newState == null || newState == undefined)
            throw new Error("Cannot transit to invalid state!");


        if (this._isTransitionPending)
            throw new Error("A transition is pending");


        this._beginTransition();

        // ensure correct options
        options = Object.assign({}, this._defaultTransitOptions, options || {});

        if (!transition) {
            // fire onInvalidTransition
            EventsBuilder
                .bind(this._config.onInvalidTransition)
                .toArgs(this, this._state, newState)
                .fireIf(options.fireEvents);

            this._endTransition();
            return false;
        }

        // fire onBeforeEveryTransition
        EventsBuilder
            .bind(this._config.onBeforeEveryTransition)
            .toArgs(this)
            .fireIf(options.fireEvents);

        // fire onBeforeTransition
        EventsBuilder
            .bind(transition.onBeforeTransition)
            .toArgs(this)
            .fireIf(options.fireEvents);

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(this._state, StateHookType.OnBeforeLeave);
            if (!options.ignoreHooksResults && !canProceed) {
                this._endTransition();
                return false;
            }
        }

        // fire onStateLeave
        EventsBuilder
            .bind(this._config.onStateLeave)
            .toArgs(this, this._state)
            .fireIf(options.fireEvents);

        // just left old status
        const oldState = this._state;

        // status is undefined now
        this._state = undefined;

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(oldState, StateHookType.OnAfterLeave);
            if (!options.ignoreHooksResults && !canProceed) {
                this._endTransition();
                return false;
            }
        }

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(newState, StateHookType.OnBeforeEnter);
            if (!options.ignoreHooksResults && !canProceed) {
                this._endTransition();
                return false;
            }
        }

        // update the state
        this._state = newState;


        // fire onStateEnter
        EventsBuilder
            .bind(this._config.onStateEnter)
            .toArgs(this, this._state)
            .fireIf(options.fireEvents);

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(this._state, StateHookType.OnAfterEnter);
            if (!options.ignoreHooksResults && !canProceed) {
                this._endTransition();
                return false;
            }
        }

        // fire onAfterTransition
        EventsBuilder
            .bind(transition.onAfterTransition)
            .toArgs(this)
            .fireIf(options.fireEvents);

        // fire onAfterEveryTransition
        EventsBuilder
            .bind(this._config.onAfterEveryTransition)
            .toArgs(this)
            .fireIf(options.fireEvents);

        this._endTransition();

        return true;
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
                if (transition.from.find(s => s == this._state)) {
                    if (Array.isArray(transition.to)) {
                        // [A,B,C] -> [D,E,F]
                        const tr = transition.to.find(s => s == newState);
                        if (tr)
                            toRet = toRet || transition;
                    } else {
                        // [A,B,C] -> D
                        if (transition.to == newState)
                            toRet = toRet || transition;
                    }
                }
            } else {
                if (transition.from == this._state) {
                    if (Array.isArray(transition.to)) {
                        // A -> [B,C,D]
                        const tr = transition.to.find(s => s == newState)
                        if (tr)
                            toRet = toRet || transition;
                    } else {
                        // A -> B
                        if (transition.to == newState)
                            toRet = toRet || transition;
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

        this.throwIfNotInitialized();

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
    public async gotoAsync(newState: T): Promise<void> {

        this.throwIfNotInitialized();

        let transition = this.getTransition(newState);

        if (!transition) {
            // not existing transition, so no hooks
            transition = new Transition({
                from: this._state,
                to: newState
            })
        }

        await this._transitAsync(transition, newState, {
            ignoreHooksResults: true
        });

    }

    /**
     * Add a new hook handler in the specified state and hook type.
     * 
     * If an hook already exist with the same combination of state and hookType it will be replaced.
     * 
     * @param applyToStates The state associated to this hook
     * @param hookType The hook type
     * @param handler The executed handler
     */
    public bindHookHandler(applyToStates: T | T[], hookType: StateHookType, handler: HookHandler<T>): void {

        this._config.hooks = this._config.hooks || [];

        const states = Array.isArray(applyToStates) ? applyToStates : [applyToStates];

        states.forEach(state => {
            const existState = this._config.hooks.find(h => h.state == state);
            if (existState) {
                existState.handlers = existState.handlers || [];
                const existHook = existState.handlers.find(h => h.hookType == hookType);
                if (existHook)
                    existHook.handler = handler;
                else
                    existState.handlers.push({
                        hookType: hookType,
                        handler: handler
                    });
            } else {
                this._config.hooks.push({
                    state: state,
                    handlers: [
                        {
                            hookType: hookType,
                            handler: handler
                        }
                    ]
                });
            }
        });

    }
}