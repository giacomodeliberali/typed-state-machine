import { TypedStateMachine } from "../typed-state-machine";
import { Transition } from "../models/transition.model";
import { LiteralEnum } from "./my-enum.enum";
import { StateHookType } from "../models/state-lifecycle-hook-type.enum";
import { State } from "../models/state.model";

/**
 * The typed machine under test
 */
let tsm: TypedStateMachine<LiteralEnum>;

/**
 * The list of transition used to build the ts machine
 */
const transitions = [
    new Transition({
        from: LiteralEnum.A,
        to: LiteralEnum.B,
        name: "A->B"
    }),
    new Transition({
        from: LiteralEnum.A,
        to: LiteralEnum.C,
        name: "A->C"
    }),
    new Transition({
        from: LiteralEnum.A,
        to: [
            LiteralEnum.D,
            LiteralEnum.E
        ],
        name: "A->[D,E]"
    }),
    new Transition({
        from: [
            LiteralEnum.F,
            LiteralEnum.D
        ],
        to: LiteralEnum.A,
        name: "loop"
    })
];

// general state hooks
const onStateEnterMock = jest.fn();
const onStateLeaveMock = jest.fn();

// general transition hooks
const onAfterEveryTransitionMock = jest.fn();
const onBeforeEveryTransitionMock = jest.fn();
const onInvalidTransitionMock = jest.fn();

// initial state specific hooks
const onBeforeState_A_Enter = jest.fn().mockReturnValue(true); // return true to allow entering in that state
const onAfterState_A_Enter = jest.fn();

// initialize a new TypedStateMachine
beforeEach(async () => {
    tsm = await new TypedStateMachine({
        initialState: LiteralEnum.A,
        transitions: transitions,

        // general hooks
        onStateEnter: onStateEnterMock,
        onStateLeave: onStateLeaveMock,
        onAfterEveryTransition: onAfterEveryTransitionMock,
        onBeforeEveryTransition: onBeforeEveryTransitionMock,
        onInvalidTransition: onInvalidTransitionMock,

        // state hooks
        hooks: [
            {
                state: LiteralEnum.A,
                handlers: [
                    {
                        hookType: StateHookType.OnBeforeEnter,
                        handler: onBeforeState_A_Enter
                    },
                    {
                        hookType: StateHookType.OnAfterEnter,
                        handler: onAfterState_A_Enter
                    }
                ]
            }
        ]
    }).initialize();
});

describe("TypedStateMachine initialization", () => {

    it("Should NOT reference the given transitions array", () => {
        const transFun = tsm.getAllTransitions();

        expect(transFun).not.toBe(transitions);

        transFun.push(new Transition({
            from: LiteralEnum.A,
            to: LiteralEnum.F,
        }));

        expect(tsm.getAllTransitions().length).toBe(4);
    });


    it("Should have return all(?) states", () => {

        //TODO: should I return also states that are not involved in any transition or not?

        const allStates = tsm.getAllStates();

        expect(allStates.map(s => s.state)).toEqual([
            LiteralEnum.A,
            LiteralEnum.B,
            LiteralEnum.C,
            LiteralEnum.D,
            LiteralEnum.E,
            LiteralEnum.F
        ]);
    });


    it("Should have return all transitions", () => {

        const allTransitions = tsm.getAllTransitions();

        expect(allTransitions).toEqual(transitions);
    });

    it("Should have default canSelfLoop to false", () => {
        expect(tsm.getConfig().canSelfLoop).toBe(false);
    });

    it("Should return the initial state", () => {
        expect(tsm.getState()).toBe(LiteralEnum.A);
    });
});

describe("TypedStateMachine initialization hooks", () => {

    it("Should call onBeforeEveryTransition on initialization", () => {
        expect(onBeforeEveryTransitionMock).toHaveBeenCalledTimes(1);
    });

    it("Should NOT call onStateLeave on initialization", () => {
        expect(onStateLeaveMock).not.toHaveBeenCalled();
    });

    it("Should call onStateEnter on initialization", () => {
        expect(onStateEnterMock).toHaveBeenCalledTimes(1);
    });

    it("Should call onBeforeState_A_Enter on initialization", () => {
        expect(onBeforeState_A_Enter).toHaveBeenCalledTimes(1);
    });

    it("Should call onAfterState_A_Enter on initialization", () => {
        expect(onAfterState_A_Enter).toHaveBeenCalledTimes(1);
    });

    it("Should call onAfterEveryTransition on initialization", () => {
        expect(onAfterEveryTransitionMock).toHaveBeenCalledTimes(1);
    });

});

describe("TypedStateMachine initial states", () => {

    it("Should have A as initial state", () => {
        expect(tsm.getState()).toEqual(LiteralEnum.A);
    });

    it("Should have return correct states", () => {
        const states = tsm.getAllStates();

        // A - initial state
        expect(states[0]).toEqual({
            current: true,
            reachable: false,
            state: LiteralEnum.A
        } as State<LiteralEnum>);

        // B
        expect(states[1]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.B
        } as State<LiteralEnum>);

        // C
        expect(states[2]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.C
        } as State<LiteralEnum>);

        // D
        expect(states[3]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.D
        } as State<LiteralEnum>);

        // E
        expect(states[4]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.E
        } as State<LiteralEnum>);

        // F
        expect(states[5]).toEqual({
            current: false,
            reachable: false,
            state: LiteralEnum.F
        } as State<LiteralEnum>);
    });

    it("Should have return correct next states", () => {
        const nextStates = tsm.getNextStates();

        expect(nextStates).toEqual([
            LiteralEnum.B,
            LiteralEnum.C,
            LiteralEnum.D,
            LiteralEnum.E
        ]);
    });

});

afterEach(() => {
    // general state hooks
    onStateEnterMock.mockClear();
    onStateLeaveMock.mockClear();

    // general transition hooks
    onAfterEveryTransitionMock.mockClear();
    onBeforeEveryTransitionMock.mockClear();
    onInvalidTransitionMock.mockClear();

    // initial state specific hooks
    onBeforeState_A_Enter.mockClear();
    onAfterState_A_Enter.mockClear();
});