import { EventBuilderConfig } from "../models/event-builder-config.model";

/**
 * An helper class to fire events with a fluent syntax
 */
export class EventsBuilder {

    private constructor(){
        // Cannot instantiate
    }

    /**
     * Create a new event associated with he given handler
     * 
     * Example:
     * 
     *     EventsBuilder
     *         .bind(config.eventHandler)
     *         .toArgs(param1, param2)
     *         .fireIf(condition);
     * 
     * @param eventHandler The event handler to call 
     */
    public static bind<Func extends (...args: any[]) => void>(eventHandler: Func): EventBuilderConfig<Func> {
        return new EventBuilderConfig(eventHandler);
    }
}