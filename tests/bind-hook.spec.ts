import { ThreadStateType } from "./thread-state-type.enum";
import { TypedStateMachine } from "../src/typed-state-machine";
import { Transition } from "../src/models/transition.model";
import { StateHookType } from "../src/enums/state-lifecycle-hook-type.enum";

/**
 * The typed machine under test
 */
let tsm: TypedStateMachine<ThreadStateType>;

// initialize a new TypedStateMachine
beforeEach(async () => {
    tsm = await new TypedStateMachine<ThreadStateType>({
        initialState: ThreadStateType.New,
        transitions: [
            new Transition({
                from: ThreadStateType.New,
                to: ThreadStateType.Ready,
                name: "wake_up()"
            }),
            new Transition({
                from: ThreadStateType.Ready,
                to: ThreadStateType.Running,
                name: "schedule()"
            }),
            new Transition({
                from: [
                    ThreadStateType.Running
                ],
                to: [
                    ThreadStateType.Waiting,
                    ThreadStateType.Terminated
                ],
                name: "step_stop()"
            }),
            new Transition({
                from: ThreadStateType.Waiting,
                to: ThreadStateType.Ready,
                name: "wake_up()"
            }),
            new Transition({
                from: ThreadStateType.Waiting,
                to: ThreadStateType.Terminated,
                name: "step_stop()"
            })
        ]
    }).initializeAsync();
});

describe("TypedStateMachine bindHook()", () => {

    it("Should add a new handler to single states", async () => {
        expect(tsm.getConfig().hooks.length).toEqual(0);
        const mockHandler = jest.fn().mockReturnValue(true);
        tsm.bindHookHandler(ThreadStateType.New, StateHookType.OnBeforeLeave, mockHandler);
        expect(tsm.getConfig().hooks.length).toEqual(1);
        await tsm.transitByNameAsync("wake_up()");
        expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it("Should add a new handler to a multiple state", async () => {
        expect(tsm.getConfig().hooks.length).toEqual(0);
        const mockHandler = jest.fn().mockReturnValue(true);

        tsm.bindHookHandler([
            ThreadStateType.New,
            ThreadStateType.Ready
        ], StateHookType.OnBeforeLeave, mockHandler);

        expect(tsm.getConfig().hooks.length).toEqual(2);
        await tsm.transitByNameAsync("wake_up()");
        expect(mockHandler).toHaveBeenCalledTimes(1);
        await tsm.transitByNameAsync("schedule()");
        expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it("Should initialize if empty hooks config", async () => {
        tsm.updateConfig({
            hooks: undefined
        });
        expect(tsm.getConfig().hooks).not.toBeDefined();
        tsm.bindHookHandler(ThreadStateType.New, StateHookType.OnBeforeLeave, jest.fn());
        expect(tsm.getConfig().hooks.length).toEqual(1);
    });

    it("Should add if hooks config already exist", async () => {
        const mockHandler = jest.fn().mockReturnValue(true);
        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.New,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeLeave,
                            handler: mockHandler
                        }
                    ]
                },
                {
                    state: ThreadStateType.Ready,
                    handlers: []
                },
                {
                    state: ThreadStateType.Running,
                    handlers: undefined
                }
            ]
        });
        expect(tsm.getConfig().hooks[0].handlers.length).toEqual(1);

        tsm.bindHookHandler(ThreadStateType.New, StateHookType.OnAfterLeave, jest.fn());

        expect(tsm.getConfig().hooks[0].handlers.length).toEqual(2);

        expect(tsm.getConfig().hooks[2].handlers).not.toBeDefined();
        tsm.bindHookHandler([ThreadStateType.New, ThreadStateType.Running], StateHookType.OnAfterLeave, jest.fn());
        expect(tsm.getConfig().hooks[2].handlers.length).toEqual(1);
});

});