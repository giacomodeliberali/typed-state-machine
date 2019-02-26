import { LiteralEnum } from "./my-enum.enum";
import { Transition } from "../src/models/transition.model";

const transitions = [
    new Transition({
        from: LiteralEnum.A,
        to: LiteralEnum.B,
        name: "First"
    }),
    new Transition({
        from: LiteralEnum.B,
        to: [
            LiteralEnum.C,
            LiteralEnum.D
        ],
        name: "Second"
    }),
    new Transition({
        from: [
            LiteralEnum.C,
            LiteralEnum.D
        ],
        to: LiteralEnum.E,
        name: "Third"
    }),
    new Transition({
        from: [
            LiteralEnum.C,
            LiteralEnum.D
        ],
        to: [
            LiteralEnum.F
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