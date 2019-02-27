import { HookFunction } from "../models/hook-function.model";
import { StateHookType } from "../models/state-lifecycle-hook-type.enum";
import { TypedStateMachine } from "../typed-state-machine";

export class HooksHelper {

    public static async triggerHooks<T>(hooks: Array<HookFunction<T>>, hookType: StateHookType, tsm: TypedStateMachine<T>) {

        const resolvers: Array<Promise<boolean>> = [];
        let okFlag = true;

        hooks.forEach(hooks => {
            hooks.handlers.forEach(handlerConfig => {
                if (handlerConfig.hookType == hookType) {
                    const result = handlerConfig.handler.call(undefined, tsm);
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

}