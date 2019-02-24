import { TypedStateMachine } from "./typed-state-machine";
import { Transition } from "./models/transition.model";
import { StateHookType } from "./models/state-lifecycle-hook-type.enum";

enum MyEnum {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
    E = "E",
    F = "F"
}

async function boot() {
    const tsm = new TypedStateMachine({
        initialState: MyEnum.A,
        transitions: [
            new Transition({
                from: MyEnum.A,
                to: MyEnum.B,
                onBeforeTransition: (tsm) => {
                    console.log("[onBeforeTransition: A->B ] => " + tsm.getState());
                },
                onAfterTransition: (tsm) => {
                    console.log("[onAfterTransition: A->B ] => " + tsm.getState());
                }
            }),
            new Transition({
                from: MyEnum.B,
                to: MyEnum.C
            }),
            new Transition({
                from: MyEnum.C,
                to: [
                    MyEnum.D,
                    MyEnum.E,
                    MyEnum.F
                ]
            })
        ],
        canSelfLoop: true,
        hooks: [
            {
                state: MyEnum.A,
                handlers: [
                    {
                        hookType: StateHookType.OnBeforeLeave,
                        handler: (tsm) => {
                            console.log("[OnBeforeLeave: A ] => " + tsm.getState());
                            return false;
                        }
                    },
                    {
                        hookType: StateHookType.OnAfterLeave,
                        handler: (tsm) => {
                            console.log("[OnAfterLeave: A ] => " + tsm.getState());
                            return true;
                        }
                    },
                    {
                        hookType: StateHookType.OnBeforeEnter,
                        handler: (tsm) => {
                            console.log("[OnBeforeEnter: A ] => " + tsm.getState());
                            return Promise.resolve(true);
                        }
                    },
                    {
                        hookType: StateHookType.OnAfterEnter,
                        handler: (tsm) => {
                            console.log("[OnAfterEnter: A ] => " + tsm.getState());
                            return true;
                        }
                    }
                ]
            }
        ],
        onAfterEveryTransition: (tsm) => {
            console.log("[onAfterEveryTransition] => ", tsm.getAllStates());
        },
        onInvalidTransition: (tsm, from, to) => {
            console.error(`[onInvalidTransition] ${from}->${to}`);
        }
    });

    await tsm.initialize();

    console.log("\nTRANSITIONS:\n", tsm.getAllTransitions().join("\n"), "\n");


    tsm.transit(MyEnum.B);
    tsm.transit(MyEnum.B);

    return tsm;
}

boot();