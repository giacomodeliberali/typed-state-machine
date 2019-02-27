
/**
 * A configuration for a single event
 */
export class EventBuilderConfig<Func extends (...args: any[]) => void> {

    /**
     * The event handler to call
     */
    private eventHandler: Func;

    /**
     * The arguments with which call the handler
     */
    private args: Array<Parameters<Func>>

    /**
     * Creates a new event configuration
     * @param eventHandler The event handler to call
     */
    constructor(eventHandler: Func) {
        this.eventHandler = eventHandler
    }

    /**
     * Associate the parameters with which call the handler
     * @param args The arguments with which the handler will be called
     */
    toArgs(...args: Array<Parameters<Func>>) {
        this.args = args;
        return this;
    }

    /**
     * Fire the event handler iff the condition evaluates to true with the supplied parameters.
     * @param condition A boolean condition to check to handler should be called or not
     */
    fireIf(condition: boolean) {
        if (condition)
            this.fire();
    }

    /**
     * Fire the event handler with the supplied parameters.
     */
    fire() {
        if (typeof this.eventHandler == "function")
            this.eventHandler.call(undefined, this.args);
    }
}