/**
 * The available hooks for the states
 */
export enum StateHookType {
    /**
     * Fired before leaving a state
     */
    OnBeforeLeave,

    /**
     * Fired after leave a state
     */
    OnAfterLeave,

    /**
     * Fired before entering a state
     */
    OnBeforeEnter,

    /**
     * Fired after enter a state
     */
    OnAfterEnter
}