import { Transition } from "../src/models/transition.model";
import { TypedStateMachine } from "../src/typed-state-machine";
import { LiteralEnum } from "./my-enum.enum";
import { StateHookType } from "../src/enums/state-lifecycle-hook-type.enum";
import { StateInfo } from "../src/models/state-info.model";
import { StateHookConfig } from "../src/models/state-hook-config.model";

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

// initial state specific hooks
const onBeforeState_A_Enter = jest.fn().mockReturnValue(true); // return true to allow entering in that state
const onAfterState_A_Enter = jest.fn().mockReturnValue(true); // return true to allow leaving in that state;

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
    }).initializeAsync();
});

describe("TypedStateMachine initialization", () => {

    it("Should require a configuration", () => {
        expect(() => new TypedStateMachine(null)).toThrowError();
        expect(() => new TypedStateMachine(undefined)).toThrowError();
    });

    it("Should require an initial state", () => {

        expect(() => new TypedStateMachine({
            transitions: [],
            initialState: undefined
        })).toThrowError();

        expect(() => new TypedStateMachine({
            transitions: [],
            initialState: null
        })).toThrowError();

        expect(() => new TypedStateMachine({
            transitions: [],
            initialState: 0
        })).not.toThrowError();

    });

    it("Should not crash if transition are not given at constructor", async () => {

        let lTsm: TypedStateMachine<number>;

        expect(() => {
            lTsm = new TypedStateMachine({
                transitions: null,
                initialState: 0
            });
        }).not.toThrowError();

        expect(() => lTsm.getAllTransitions()).toThrowError(); // missing initialization

        await lTsm.initializeAsync();

        expect(lTsm.getAllTransitions()).toEqual([]);

        expect(lTsm.getAllStates()).toEqual([]);

    });

    it("Should throw if initialize() is called multiple times", () => {
        expect(tsm.initializeAsync()).rejects.toThrowError();
    });

    it("Should throw if a transition is pending and another one is requested", async (done) => {
        const lTsm = await new TypedStateMachine({
            initialState: LiteralEnum.A,
            transitions: [
                new Transition({
                    from: LiteralEnum.A,
                    to: LiteralEnum.B
                }),
                new Transition({
                    from: LiteralEnum.B,
                    to: LiteralEnum.C
                })
            ],
            hooks: [
                {
                    state: LiteralEnum.A,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeLeave,
                            handler: () => {
                                return new Promise((resolve, reject) => {
                                    setTimeout(() => {
                                        resolve(true);
                                    }, 300);
                                });
                            }
                        }
                    ]
                }
            ]
        }).initializeAsync();

        const transition = lTsm.transitAsync(LiteralEnum.B);
        expect(() => lTsm.getState()).toThrowError(/pending/);
        expect(lTsm.isPending()).toBe(true);

        expect(lTsm.transitAsync(LiteralEnum.C)).rejects.toThrowError(/pending/)

        await transition;
        done();
    });

    it("Should throw if OnBeforeEnter in initial state return falsy values", () => {
        const lTsm = new TypedStateMachine({
            initialState: 0,
            transitions: [],
            hooks: [
                {
                    state: 0,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeEnter,
                            handler: jest.fn().mockReturnValue(false)
                        }
                    ]
                }
            ]
        });

        expect(lTsm.initializeAsync()).rejects.toThrow();

        lTsm.updateConfig({
            hooks: [
                {
                    state: 0,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeEnter,
                            handler: jest.fn().mockReturnValue(Promise.resolve(false))
                        }
                    ]
                }
            ]
        });

        expect(lTsm.initializeAsync()).rejects.toThrow();

        lTsm.updateConfig({
            hooks: [
                {
                    state: 0,
                    handlers: [
                        {
                            hookType: StateHookType.OnBeforeEnter,
                            handler: jest.fn().mockReturnValue(true)
                        }
                    ]
                }
            ]
        });

        expect(lTsm.initializeAsync()).resolves.not.toThrow();

    });

    it("Should log a warning if OnAfterEnter in initial state return falsy values", async () => {
        const lTsm = new TypedStateMachine({
            initialState: 0,
            transitions: [],
            hooks: [
                {
                    state: 0,
                    handlers: [
                        {
                            hookType: StateHookType.OnAfterEnter,
                            handler: jest.fn().mockReturnValue(false)
                        }
                    ]
                }
            ]
        });

        const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => { });

        expect(warnSpy).toHaveBeenCalledTimes(0);
        await lTsm.initializeAsync();
        expect(warnSpy).toHaveBeenCalledTimes(1);

    });

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

    it("Should set the initial state", () => {
        expect(tsm.getState()).toBe(LiteralEnum.A);
    });

    it("Should throw an error if a falsy state is requested", async () => {
        expect(tsm.getState()).toBe(LiteralEnum.A);

        expect(tsm.transitAsync(undefined)).rejects.toThrowError();
        expect(tsm.transitAsync(null)).rejects.toThrowError();
        expect(tsm.transitAsync(0 as any)).resolves.toEqual(false);
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
        } as StateInfo<LiteralEnum>);

        // B
        expect(states[1]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.B
        } as StateInfo<LiteralEnum>);

        // C
        expect(states[2]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.C
        } as StateInfo<LiteralEnum>);

        // D
        expect(states[3]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.D
        } as StateInfo<LiteralEnum>);

        // E
        expect(states[4]).toEqual({
            current: false,
            reachable: true,
            state: LiteralEnum.E
        } as StateInfo<LiteralEnum>);

        // F
        expect(states[5]).toEqual({
            current: false,
            reachable: false,
            state: LiteralEnum.F
        } as StateInfo<LiteralEnum>);
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

    it("Should have empty hooks if none was given", () => {

        tsm = new TypedStateMachine({
            initialState: LiteralEnum.A,
            transitions: []
        });

        expect(tsm).toBeDefined();
    });

    it("Should fallback to false canSelfLoop", () => {

        expect(tsm.getConfig().canSelfLoop).toEqual(false);

        tsm.updateConfig({
            canSelfLoop: true
        });

        expect(tsm.getConfig().canSelfLoop).toEqual(true);
    });

    it("Should support multiple from and multiple to", async () => {

        tsm.updateConfig({
            transitions: [
                new Transition({
                    from: [
                        LiteralEnum.A,
                        LiteralEnum.B
                    ],
                    to: [
                        LiteralEnum.B,
                        LiteralEnum.F,
                        LiteralEnum.E
                    ]
                })
            ]
        });

        expect(tsm.getState()).toEqual(LiteralEnum.A);

        await tsm.transitAsync(LiteralEnum.B);

        expect(tsm.getState()).toEqual(LiteralEnum.B);

        await tsm.transitAsync(LiteralEnum.E);

        expect(tsm.getState()).toEqual(LiteralEnum.E);

        expect(tsm.can(LiteralEnum.A)).toBe(false);

    });

    it("Should support multiple from and single to", async () => {

        tsm.updateConfig({
            transitions: [
                new Transition({
                    from: LiteralEnum.A,
                    to: [
                        LiteralEnum.B,
                        LiteralEnum.F
                    ]
                }),
                new Transition({
                    from: [
                        LiteralEnum.A,
                        LiteralEnum.B
                    ],
                    to: LiteralEnum.E
                })
            ]
        });

        expect(tsm.getState()).toEqual(LiteralEnum.A);

        await tsm.transitAsync(LiteralEnum.B);

        expect(tsm.getState()).toEqual(LiteralEnum.B);

        await tsm.transitAsync(LiteralEnum.E);

        expect(tsm.getState()).toEqual(LiteralEnum.E);

    });

});

afterEach(() => {
    jest.clearAllMocks();
});