import { TypedStateMachine } from "../typed-state-machine";
import { Transition } from "../models/transition.model";
import { StateHookType } from "../models/state-lifecycle-hook-type.enum";
import { State } from "../models/state.model";
import { ThreadStateType } from "./thread-state-type.enum";

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
const onBeforeState_New_Enter = jest.fn().mockReturnValue(true);
const onAfterState_New_Enter = jest.fn().mockReturnValue(true);
const onAfterState_New_Leave = jest.fn().mockReturnValue(true);
const onBeforeState_New_Leave = jest.fn().mockReturnValue(true);

const onBeforeState_Ready_Enter = jest.fn().mockReturnValue(true);

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

        tsm.setCanSelfLoop(true);

        expect(tsm.can(ThreadStateType.New)).toBe(true);
    });

    it("Should invoke self loop transition hooks if flag is on", async () => {

        expect(tsm.getState()).toBe(ThreadStateType.New)

        tsm.setCanSelfLoop(true);

        resetMockFunctions();

        await tsm.transit(ThreadStateType.New);

        expect(tsm.getState()).toBe(ThreadStateType.New);

        expect(onBeforeState_New_Leave).toHaveBeenCalledTimes(1);
        expect(onAfterState_New_Leave).toHaveBeenCalledTimes(1);

        expect(onBeforeState_New_Enter).toHaveBeenCalledTimes(1);
        expect(onBeforeState_New_Enter).toHaveBeenCalledTimes(1);
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

        tsm["state"] = ThreadStateType.New;


        onBeforeState_Ready_Enter.mockReturnValue(false);

        //TODO: in this case, the state should be brang back to the previous value or left undefined?
        success = await tsm.transit(ThreadStateType.Ready);
        expect(success).toBe(false);
        expect(tsm.getState()).not.toBeDefined();

    });

});

function resetMockFunctions() {
    // general state hooks
    onStateEnterMock.mockClear();
    onStateLeaveMock.mockClear();

    // general transition hooks
    onAfterEveryTransitionMock.mockClear();
    onBeforeEveryTransitionMock.mockClear();
    onInvalidTransitionMock.mockClear();

    // initial state specific hooks
    onBeforeState_New_Enter.mockClear();
    onAfterState_New_Enter.mockClear();
    onAfterState_New_Leave.mockClear();
    onBeforeState_New_Leave.mockClear();

    onBeforeState_Ready_Enter.mockClear();
}

afterEach(() => {
    resetMockFunctions();
});