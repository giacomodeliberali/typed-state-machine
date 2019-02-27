import { StateHookType } from "./state-lifecycle-hook-type.enum";
import { HookHandler } from "./hook-handler.type";

/**
 * Represent a configuration for a state hook
 */
export class StateHookConfig<T> {

    /**
     * The hook type that represent when this handler for the given state
     * will be called
     */
    hookType: StateHookType;

    /**
     * The hook called for the specified state in the specified hookType.
     * 
     * Must return a truly value (like true or Promise<true>)
     * in order to make the transition proceed, or false | Promise<false> otherwise.
     */
    handler: HookHandler<T>;
}