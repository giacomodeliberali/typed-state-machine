export interface TransitOptions {
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