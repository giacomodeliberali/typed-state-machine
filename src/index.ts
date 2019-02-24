import { TypedStateMachine } from "./typed-state-machine";
import { Transition } from "./models/transition.model";

enum MyEnum {
    A = "A",
    B = "B",
    C = "C",
    D = "D",
    E = "E",
    F = "F"
}

function boot() {
    const tsm = new TypedStateMachine({
        initialState: MyEnum.A,
        transitions: [
            new Transition({
                from: MyEnum.A,
                to: MyEnum.B,
                name: "Uno"
            }),
            new Transition({
                from: MyEnum.A,
                to: MyEnum.C,
                name: "Due"
            }),
            new Transition({
                from: MyEnum.A,
                to: [
                    MyEnum.E,
                    MyEnum.F
                ],
                name: "Tre"
            })
        ],
        canSelfLoop: false
    });

    console.log("TRANSITIONS:\n" + tsm.getAllTransitions().join("\n"));

    const allStates = tsm.getAllStates();

    console.log(`Current state ${tsm.getState()}\n`);
    console.log("AllStates:\n", allStates);
    console.log("Reachable states", tsm.getNextStates());
}

boot();