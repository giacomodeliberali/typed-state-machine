import { TypedStateMachine } from "../typed-state-machine";
import { GenericEventHandler } from "../types/generic-event-handler.type";

/**
 * Represent a transition function from state(s) to state(s)
 */
export class Transition<T>{

    /**
     * The starting state(s)
     */
    from: T | Array<T>;

    /**
     * The destination state(s)
     */
    to: T | Array<T>;

    /**
     * A name that identifies logically this state change (eg. Melting, Vaporizing, ...)
     */
    name: string;

    /**
     * Called before the transition occurs
     */
    onBeforeTransition?: GenericEventHandler<T>;

    /**
     * Called after the transition occurs
     */
    onAfterTransition?: GenericEventHandler<T>;

    /**
     * Create a new transition function
     * @param config The transition configuration
     */
    constructor(config: Partial<Transition<T>>) {
        Object.assign(this, config);
    }

    /**
     * Return the state(s) involved in this transition as a formatted text
     */
    toString() {
        let string = "";
        if (Array.isArray(this.from))
            string = `[${this.from.map(s => s).join(",")}]->`;
        else
            string = `${this.from}->`;


        if (Array.isArray(this.to))
            string += `[${this.to.map(s => s).join(",")}]`;
        else
            string += `${this.to}`;

        if (this.name)
            string += ` (${this.name})`;

        return string;
    }
}