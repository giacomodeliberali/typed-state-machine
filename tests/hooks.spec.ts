import { ThreadStateType } from "./thread-state-type.enum";
import { TypedStateMachine } from "../src/typed-state-machine";
import { Transition } from "../src/models/transition.model";
import { StateHookType } from "../src/models/state-lifecycle-hook-type.enum";

/**
 * The typed machine under test
 */
let tsm: TypedStateMachine<ThreadStateType>;

// general state hooks
const onStateEnterMock = jest.fn();
const onStateLeaveMock = jest.fn();

// general transition hooks
const onAfterEveryTransitionMock = jest.fn();
const onBeforeEveryTransitionMock = jest.fn();
const onInvalidTransitionMock = jest.fn();

// initial state specific hooks: return true to allow entering/leaving in that state
const onBeforeState_New_Enter = jest.fn().mockReturnValue(Promise.resolve(true));
const onAfterState_New_Enter = jest.fn().mockReturnValue(true);
const onAfterState_New_Leave = jest.fn().mockReturnValue(true);
const onBeforeState_New_Leave = jest.fn().mockReturnValue(Promise.resolve(true));

const onBeforeState_Ready_Enter = jest.fn().mockReturnValue(true);

const onBeforeTransition_New2Ready = jest.fn();
const onAfterTransition_New2Ready = jest.fn();

// initialize a new TypedStateMachine
beforeEach(async () => {
    tsm = await new TypedStateMachine<ThreadStateType>({
        initialState: ThreadStateType.New,
        transitions: [
            new Transition({
                from: ThreadStateType.New,
                to: ThreadStateType.Ready,
                name: "wake_up()",
                onAfterTransition: onBeforeTransition_New2Ready,
                onBeforeTransition: onAfterTransition_New2Ready
            }),
            new Transition({
                from: ThreadStateType.Ready,
                to: ThreadStateType.Running,
                name: "schedule()"
            }),
            new Transition({
                from: ThreadStateType.Running,
                to: [
                    ThreadStateType.Waiting,
                    ThreadStateType.Terminated
                ]
            }),
            new Transition({
                from: ThreadStateType.Waiting,
                to: ThreadStateType.Ready,
                name: "wake_up()"
            }),
            new Transition({
                from: ThreadStateType.Terminated,
                to: [
                    ThreadStateType.New,
                    ThreadStateType.Ready
                ]
            })
        ],

        // general hooks
        onStateEnter: onStateEnterMock,
        onStateLeave: onStateLeaveMock,
        onAfterEveryTransition: onAfterEveryTransitionMock,
        onBeforeEveryTransition: onBeforeEveryTransitionMock,
        onInvalidTransition: onInvalidTransitionMock,

        // state hooks
        hooks: [
            {
                state: ThreadStateType.New,
                handlers: [
                    {
                        hookType: StateHookType.OnBeforeEnter,
                        handler: onBeforeState_New_Enter
                    },
                    {
                        hookType: StateHookType.OnAfterEnter,
                        handler: onAfterState_New_Enter
                    },
                    {
                        hookType: StateHookType.OnBeforeLeave,
                        handler: onBeforeState_New_Leave
                    },
                    {
                        hookType: StateHookType.OnAfterLeave,
                        handler: onAfterState_New_Leave
                    }
                ]
            },
            {
                state: ThreadStateType.Ready,
                handlers: [
                    {
                        hookType: StateHookType.OnBeforeEnter,
                        handler: onBeforeState_Ready_Enter
                    }
                ]
            }
        ]
    }).initialize();
});

describe("TypedStateMachine state hooks", () => {

    it("Should invoke OnBeforeEnter at startup", () => {
        expect(onBeforeState_New_Enter).toHaveBeenCalledTimes(1);
        expect(onBeforeState_New_Enter).toHaveBeenCalledWith(tsm);
    });

    it("Should invoke OnAfterEnter at startup", () => {
        expect(onAfterState_New_Enter).toHaveBeenCalledTimes(1);
        expect(onAfterState_New_Enter).toHaveBeenCalledWith(tsm);
    });

    it("Should NOT invoke OnBeforeLeave at startup", () => {
        expect(onBeforeState_New_Leave).not.toHaveBeenCalled();
    });

    it("Should NOT invoke OnAfterLeave at startup", () => {
        expect(onAfterState_New_Leave).not.toHaveBeenCalled();
    });

    it("Should avoid self loop if flag is off", async () => {

        expect(tsm.getState()).toBe(ThreadStateType.New);

        expect(tsm.can(ThreadStateType.New)).toBe(false);

        const success = await tsm.transit(ThreadStateType.New);

        expect(success).toBe(false);
        expect(tsm.getState()).toBe(ThreadStateType.New);

        expect(onBeforeState_New_Leave).not.toHaveBeenCalled();
        expect(onAfterState_New_Leave).not.toHaveBeenCalled();
    });


    it("Should allow self loop if flag is on", async () => {

        expect(tsm.getState()).toBe(ThreadStateType.New);

        expect(tsm.can(ThreadStateType.New)).toBe(false);

        tsm.updateConfig({
            canSelfLoop: true
        });

        expect(tsm.can(ThreadStateType.New)).toBe(true);
    });

    it("Should invoke self loop transition hooks if flag is on", async () => {

        expect(tsm.getState()).toBe(ThreadStateType.New)

        tsm.updateConfig({
            canSelfLoop: true
        });

        jest.clearAllMocks();

        await tsm.transit(ThreadStateType.New);

        expect(tsm.getState()).toBe(ThreadStateType.New);

        expect(onBeforeState_New_Leave).toHaveBeenCalledTimes(1);
        expect(onAfterState_New_Leave).toHaveBeenCalledTimes(1);

        expect(onBeforeState_New_Enter).toHaveBeenCalledTimes(1);
        expect(onBeforeState_New_Enter).toHaveBeenCalledTimes(1);

        expect(onBeforeEveryTransitionMock).toHaveBeenCalledTimes(1);
        expect(onAfterEveryTransitionMock).toHaveBeenCalledTimes(1);
    });

    it("Should respect given transitions", async () => {
        expect(tsm.getState()).toBe(ThreadStateType.New);

        let success = await tsm.transit(ThreadStateType.Waiting);
        expect(success).toBe(false);
        expect(tsm.getState()).toBe(ThreadStateType.New);

        success = await tsm.transit(ThreadStateType.Running);
        expect(success).toBe(false);
        expect(tsm.getState()).toBe(ThreadStateType.New);

        success = await tsm.transit(ThreadStateType.Terminated);
        expect(success).toBe(false);
        expect(tsm.getState()).toBe(ThreadStateType.New);

        expect(tsm.getNextStates()).toEqual([
            ThreadStateType.Ready
        ]);

        // first valid transition
        success = await tsm.transit(ThreadStateType.Ready);
        expect(success).toBe(true);
        expect(tsm.getState()).toBe(ThreadStateType.Ready);
        expect(tsm.getNextStates()).toEqual([
            ThreadStateType.Running
        ]);
        expect(onBeforeTransition_New2Ready).toHaveBeenCalledTimes(1);
        expect(onAfterTransition_New2Ready).toHaveBeenCalledTimes(1);


        success = await tsm.transit(ThreadStateType.Running);
        expect(success).toBe(true);
        expect(tsm.getState()).toBe(ThreadStateType.Running);
        expect(tsm.getNextStates()).toEqual([
            ThreadStateType.Waiting,
            ThreadStateType.Terminated
        ]);

        success = await tsm.transit(ThreadStateType.Waiting);
        expect(success).toBe(true);
        expect(tsm.getState()).toBe(ThreadStateType.Waiting);
        expect(tsm.getNextStates()).toEqual([
            ThreadStateType.Ready
        ]);
    });

    it("Should call handlers and check their return values", async () => {

        expect(tsm.can(ThreadStateType.Ready)).toBe(true);

        let success = await tsm.transit(ThreadStateType.Ready);
        expect(success).toBe(true);
        expect(tsm.getState()).toBe(ThreadStateType.Ready);

        tsm["_state"] = ThreadStateType.New;


        onBeforeState_Ready_Enter.mockReturnValue(false);

        //TODO: in this case, the state should be brang back to the previous value or left undefined?
        success = await tsm.transit(ThreadStateType.Ready);
        expect(success).toBe(false);
        expect(tsm.getState()).not.toBeDefined();

    });


    it("Should call onInvalidTransition if a not allowed transition is performed", async () => {

        expect(onInvalidTransitionMock).not.toHaveBeenCalled();

        await tsm.transit(ThreadStateType.Terminated);

        expect(onInvalidTransitionMock).toHaveBeenCalledTimes(1);
    });

});

describe("Hooks: OnBeforeEnter", () => {
    it("Should take care hook boolean return value before proceeding", async () => {

        const onBeforeEnterState = jest.fn().mockReturnValue(false);

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.Ready,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeEnter,
                            handler: onBeforeEnterState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).not.toBeDefined()

    });

    it("Should take care hook Promise<boolean> return value before proceeding", async () => {
        
        const onBeforeEnterState = jest.fn().mockReturnValue(Promise.resolve(false));

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.Ready,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeEnter,
                            handler: onBeforeEnterState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).not.toBeDefined()

    });
});

describe("Hooks: OnBeforeLeave", () => {
    it("Should take care hook boolean return value before proceeding", async () => {

        const onBeforeLeaveState = jest.fn().mockReturnValue(false);

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.New,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeLeave,
                            handler: onBeforeLeaveState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).toBe(ThreadStateType.New);

    });

    it("Should take care hook Promise<boolean> return value before proceeding", async () => {
        
        const onBeforeLeaveState = jest.fn().mockReturnValue(Promise.resolve(false));

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.New,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeLeave,
                            handler: onBeforeLeaveState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).toBe(ThreadStateType.New);

    });
});

describe("Hooks: OnAfterLeave", () => {
    it("Should take care hook boolean return value before proceeding", async () => {

        const onAfterLeaveState = jest.fn().mockReturnValue(false);

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.New,
                    handlers: [
                        {
                            hookType: StateHookType.OnAfterLeave,
                            handler: onAfterLeaveState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).not.toBeDefined()

    });

    it("Should take care hook Promise<boolean> return value before proceeding", async () => {
        
        const onAfterLeaveState = jest.fn().mockReturnValue(Promise.resolve(false));

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.New,
                    handlers: [
                        {
                            hookType: StateHookType.OnAfterLeave,
                            handler: onAfterLeaveState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).not.toBeDefined()

    });
});

describe("Hooks: OnAfterEnter", () => {
    it("Should take care hook boolean return value before proceeding", async () => {

        const onAfterEnterState = jest.fn().mockReturnValue(false);

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.Ready,
                    handlers: [
                        {
                            hookType: StateHookType.OnAfterEnter,
                            handler: onAfterEnterState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).toBe(ThreadStateType.Ready);

    });

    it("Should take care hook Promise<boolean> return value before proceeding", async () => {
        

        const onAfterEnterState = jest.fn().mockReturnValue(Promise.resolve(false));

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.Ready,
                    handlers: [
                        {
                            hookType: StateHookType.OnAfterEnter,
                            handler: onAfterEnterState
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.transit(ThreadStateType.Ready);

        expect(tsm.getState()).toBe(ThreadStateType.Ready);

    });
});

describe("Goto method life cycles", () => {
    it("Should invoke all life cycle of NOT existing transitions", async () => {

        const onBeforeLeaveState_New = jest.fn().mockReturnValue(true);
        const onAfterLeaveState_New = jest.fn().mockReturnValue(true);

        const onBeforeEnterState_Terminated = jest.fn().mockReturnValue(true);
        const onAfterEnterState_Terminated = jest.fn().mockReturnValue(true);
        

        tsm.updateConfig({
            hooks: [
                {
                    state: ThreadStateType.Terminated,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeEnter,
                            handler: onBeforeEnterState_Terminated
                        },
                        {
                            hookType: StateHookType.OnAfterEnter,
                            handler: onAfterEnterState_Terminated
                        }
                    ]
                },
                {
                    state: ThreadStateType.New,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeLeave,
                            handler: onBeforeLeaveState_New
                        },
                        {
                            hookType: StateHookType.OnAfterLeave,
                            handler: onAfterLeaveState_New
                        }
                    ]
                }
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.goto(ThreadStateType.Terminated);

        expect(tsm.getState()).toBe(ThreadStateType.Terminated);

        expect(onBeforeLeaveState_New).toHaveBeenCalledTimes(1);
        expect(onAfterLeaveState_New).toHaveBeenCalledTimes(1);
        expect(onBeforeEnterState_Terminated).toHaveBeenCalledTimes(1);
        expect(onAfterEnterState_Terminated).toHaveBeenCalledTimes(1);


        // Expect 2 because the everyTransition in fired also in the initialize() of the machine
        expect(onBeforeEveryTransitionMock).toHaveBeenCalledTimes(2);
        expect(onAfterEveryTransitionMock).toHaveBeenCalledTimes(2);

    });

    it("Should invoke all life cycle of existing transitions", async () => {

        const onAfterTransition = jest.fn().mockReturnValue(true);
        const onBeforeTransition = jest.fn().mockReturnValue(true);
        

        tsm.updateConfig({
            transitions: [
                ...tsm.getAllTransitions(),
                new Transition({
                    from: ThreadStateType.New,
                    to: ThreadStateType.Terminated,
                    onAfterTransition: onAfterTransition,
                    onBeforeTransition: onBeforeTransition
                })
            ]
        })

        expect(tsm.getState()).toBe(ThreadStateType.New);

        await tsm.goto(ThreadStateType.Terminated);

        expect(tsm.getState()).toBe(ThreadStateType.Terminated);

        expect(onAfterTransition).toHaveBeenCalledTimes(1);
        expect(onBeforeTransition).toHaveBeenCalledTimes(1);

    });
});

afterEach(() => {
    jest.clearAllMocks()
});