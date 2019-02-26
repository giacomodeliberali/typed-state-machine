import { Transition } from "../src/models/transition.model";
import { TypedStateMachine } from "../src/typed-state-machine";
import { LiteralEnum } from "./my-enum.enum";

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
    }),
    new Transition({
        from: [
            LiteralEnum.A,
            LiteralEnum.B
        ],
        to: [
            LiteralEnum.C,
            LiteralEnum.D
        ]
    })
];

// initialize a new TypedStateMachine
beforeEach(async () => {
    tsm = await new TypedStateMachine({
        initialState: LiteralEnum.A,
        transitions: transitions
    }).initialize();
});

describe("TypedStateMachine minimal initialization (no hooks and events)", () => {

    it("Should allow the creation of minimal machine", async () => {

        expect(tsm).toBeDefined();

    });

    it("Should support minimal machine - transit(valid)", async () => {

        expect(tsm.getState()).toEqual(LiteralEnum.A);

        await tsm.transit(LiteralEnum.C); // valid

        expect(tsm.getState()).toEqual(LiteralEnum.C);

    });

    it("Should support minimal machine - transit(invalid)", async () => {

        expect(tsm.getState()).toEqual(LiteralEnum.A);

        await tsm.transit(LiteralEnum.F); // invalid

        expect(tsm.getState()).toEqual(LiteralEnum.A);

    });

    it("Should support minimal machine - goto()", async () => {

        expect(tsm.getState()).toEqual(LiteralEnum.A);

        await tsm.goto(LiteralEnum.F);

        expect(tsm.getState()).toEqual(LiteralEnum.F);

    });

});
