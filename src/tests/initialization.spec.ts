import { TypedStateMachine } from "../typed-state-machine";
import { Transition } from "../models/transition.model";
import { MyEnum } from "./my-enum.enum";
import { StateHookType } from "../models/state-lifecycle-hook-type.enum";
import { State } from "../models/state.model";

/**
 * The typed machine under test
 */
let tsm: TypedStateMachine<MyEnum>;

/**
 * The list of transition used to build the ts machine
 */
const transitions = [
    new Transition({
        from: MyEnum.A,
        to: MyEnum.B,
        name: "A->B"
    }),
    new Transition({
        from: MyEnum.A,
        to: MyEnum.C,
        name: "A->C"
    }),
    new Transition({
        from: MyEnum.A,
        to: [
            MyEnum.D,
            MyEnum.E
        ],
        name: "A->[D,E]"
    }),
    new Transition({
        from: [
            MyEnum.F,
            MyEnum.D
        ],
        to: MyEnum.A,
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
        initialState: MyEnum.A,
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
                state: MyEnum.A,
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
            from: MyEnum.A,
            to: MyEnum.F,
        }));

        expect(tsm.getAllTransitions().length).toBe(4);
    });


    it("Should have return all(?) states", () => {

        //TODO: should I return also states that are not involved in any transition or not?

        const allStates = tsm.getAllStates();

        expect(allStates.map(s => s.state)).toEqual([
            MyEnum.A,
            MyEnum.B,
            MyEnum.C,
            MyEnum.D,
            MyEnum.E,
            MyEnum.F
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
        expect(tsm.getState()).toBe(MyEnum.A);
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
        expect(tsm.getState()).toEqual(MyEnum.A);
    });

    it("Should have return correct states", () => {
        const states = tsm.getAllStates();

        // A - initial state
        expect(states[0]).toEqual({
            current: true,
            reachable: false,
            state: MyEnum.A
        } as State<MyEnum>);

        // B
        expect(states[1]).toEqual({
            current: false,
            reachable: true,
            state: MyEnum.B
        } as State<MyEnum>);

        // C
        expect(states[2]).toEqual({
            current: false,
            reachable: true,
            state: MyEnum.C
        } as State<MyEnum>);

        // D
        expect(states[3]).toEqual({
            current: false,
            reachable: true,
            state: MyEnum.D
        } as State<MyEnum>);

        // E
        expect(states[4]).toEqual({
            current: false,
            reachable: true,
            state: MyEnum.E
        } as State<MyEnum>);

        // F
        expect(states[5]).toEqual({
            current: false,
            reachable: false,
            state: MyEnum.F
        } as State<MyEnum>);
    });

    it("Should have return correct next states", () => {
        const nextStates = tsm.getNextStates();

        expect(nextStates).toEqual([
            MyEnum.B,
            MyEnum.C,
            MyEnum.D,
            MyEnum.E
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