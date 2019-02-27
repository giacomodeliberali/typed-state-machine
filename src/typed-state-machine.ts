import { Transition } from "./models/transition.model";
import { StateHookType } from "./models/state-lifecycle-hook-type.enum";
import { HookFunction } from "./models/hook-function.model";
import { State } from "./models/state.model";
import { TypedStateMachineConfig } from "./models/typed-state-machine-config.interface";
import { TransitOptions } from "./models/transit-options.interface";
import { EventsBuilder } from "./helpers/events-builder.helper";

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
    public async initialize(options?: TransitOptions) {

        if(this._isInitialized)
            throw new Error("The machine is already initialized and cannot be reinitialized twice.");

        // ensure correct options
        options = Object.assign({}, this._defaultTransitOptions, options || {});

        EventsBuilder
            .bind(this.config.onBeforeEveryTransition)
            .toArgs([this])
            .fireIf(options.fireEvents);

        if (options.invokeHooks) {
            const canProceed = await this.invokeHook(this._config.initialState, StateHookType.OnBeforeEnter);
            if (!canProceed && !options.ignoreHooksResults)
                throw new Error(`The hook ${StateHookType[StateHookType.OnBeforeEnter]} of state ${this.config.initialState} returned value "${canProceed}", that prevented the machine to be initialized properly. This value should be "true | Promise<true>"`);
        }

        // set initial state
        this._state = this._config.initialState;

        EventsBuilder
            .bind(this.config.onStateEnter)
            .toArgs([this, this.config.initialState])
            .fireIf(options.fireEvents);


        if (options.invokeHooks) {
            const canProceed = await this.invokeHook(this._state, StateHookType.OnAfterEnter);
            if (!canProceed && !options.ignoreHooksResults)
                console.warn(`The hook ${StateHookType[StateHookType.OnAfterEnter]} of state ${this._state} returned => ${canProceed}`);
        }

        EventsBuilder
            .bind(this.config.onAfterEveryTransition)
            .toArgs([this])
            .fireIf(options.fireEvents);

        // mark as initialized
        this._isInitialized = true;

        return this;
    }

    /**
     * Return the current configuration of the machine
     */
    public getConfig() {
        return Object.assign({}, this._config);
    }

    private checkInitialization() {
        if (!this._isInitialized)
            throw new Error("The machine has not been initialized yet. After construction enure initialize() has been called before any other operation.");
    }

    /**
     * Return the current internal state of the machine
     */
    public getState(): T {
        this.checkInitialization();
        return this._state;
    }

    /**
     * Return all the current transition functions
     */
    public getAllTransitions(): Array<Transition<T>> {
        this.checkInitialization();
        return this._config.transitions.slice();
    }

    /**
     * Returns the states that are reachable from the current state
     */
    public getNextStates(): Array<T> {
        this.checkInitialization();
        return this.getAllStates()
            .filter(s => s.reachable)
            .map(s => s.state);
    }

    /**
     * Return all the state of the machine with an extra indicator
     * that indicates if they are reachable from current state
     */
    public getAllStates(): Array<State<T>> {

        this.checkInitialization();

        // TODO: refactor this ugly code

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
     * Execute the first hook that matches the target state and the hookType
     * @param targetState The state of which you want to execute the hook
     * @param hookType The hook type that you want to execute
     */
    private async invokeHook(targetState: T, hookType: StateHookType): Promise<boolean> {

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
    public async transitByName(transitionName: string): Promise<boolean> {

        this.checkInitialization();

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
            EventsBuilder
                .bind(this._config.onInvalidTransition)
                .toArgs([this, this._state, undefined])
                .fire(); //TODO: check flag

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

        this.checkInitialization();

        let transition = this.getTransition(newState);

        if (this.isSelfLoop(newState) && this._config.canSelfLoop) {
            // self transition
            transition = new Transition({
                from: newState,
                to: newState
            })
        }

        return this._transit(transition, newState);
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
    private async _transit(transition: Transition<T>, newState: T, options?: TransitOptions): Promise<boolean> {

        if (newState == null || newState == undefined)
            throw new Error("Cannot transit to invalid state!");

        // ensure correct options
        options = Object.assign({}, this._defaultTransitOptions, options || {});

        if (!transition) {
            // fire onInvalidTransition
            EventsBuilder
                .bind(this.config.onInvalidTransition)
                .toArgs([this, this._state, newState])
                .fireIf(options.fireEvents);

            return false;
        }

        // fire onBeforeEveryTransition
        EventsBuilder
            .bind(this._config.onBeforeEveryTransition)
            .toArgs([this])
            .fireIf(options.fireEvents);

        // fire onBeforeTransition
        EventsBuilder
            .bind(transition.onBeforeTransition)
            .toArgs([this])
            .fireIf(options.fireEvents);

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(this._state, StateHookType.OnBeforeLeave);
            if (!options.ignoreHooksResults && !canProceed)
                return false;
        }

        // fire onStateLeave
        EventsBuilder
            .bind(this._config.onStateLeave)
            .toArgs([this, this._state])
            .fireIf(options.fireEvents);

        // just left old status
        const oldState = this._state;

        // status is undefined now
        this._state = undefined;

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(oldState, StateHookType.OnAfterLeave);
            if (!options.ignoreHooksResults && !canProceed)
                return false;
        }

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(newState, StateHookType.OnBeforeEnter);
            if (!options.ignoreHooksResults && !canProceed)
                return false;
        }

        // update the state
        this._state = newState;


        // fire onStateEnter
        EventsBuilder
            .bind(this._config.onStateEnter)
            .toArgs([this, this._state])
            .fireIf(options.fireEvents);

        if (options.invokeHooks) {
            let canProceed = await this.invokeHook(this._state, StateHookType.OnAfterEnter);
            if (!options.ignoreHooksResults && !canProceed)
                return false;
        }

        // fire onAfterTransition
        EventsBuilder
            .bind(transition.onAfterTransition)
            .toArgs([this])
            .fireIf(options.fireEvents);

        // fire onAfterEveryTransition
        EventsBuilder
            .bind(this.config.onAfterEveryTransition)
            .toArgs([this])
            .fireIf(options.fireEvents);

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
                if (transition.from.find(s => s == this.getState())) {
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
                if (transition.from == this.getState()) {
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

        this.checkInitialization();

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

        this.checkInitialization();

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