import { TypedStateMachine } from "../typed-state-machine";
import { Transition } from "../models/transition.model";
import { MyEnum } from "./my-enum.enum";

const transitions = [
    new Transition({
        from: MyEnum.A,
        to: MyEnum.B,
        name: "First"
    }),
    new Transition({
        from: MyEnum.B,
        to: [
            MyEnum.C,
            MyEnum.D
        ],
        name: "Second"
    }),
    new Transition({
        from: [
            MyEnum.C,
            MyEnum.D
        ],
        to: MyEnum.E,
        name: "Third"
    }),
    new Transition({
        from: [
            MyEnum.C,
            MyEnum.D
        ],
        to: [
            MyEnum.F
        ]
    }),
];

describe("Transition initialization", () => {

    it("Should construct properly the toString", () => {
        expect(transitions[0].toString()).toBe("A->B (First)");
        expect(transitions[1].toString()).toBe("B->[C,D] (Second)");
        expect(transitions[2].toString()).toBe("[C,D]->E (Third)");
        expect(transitions[3].toString()).toBe("[C,D]->[F]");
    });
});