import { TypedStateMachine } from "../typed-state-machine";
import { Transition } from "../models/transition.model";
import { MyEnum } from "./my-enum.enum";


let tsm: TypedStateMachine<MyEnum>;

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
            MyEnum.E,
            MyEnum.F
        ],
        name: "A->[E,F]"
    })
];

beforeEach(() => {
    tsm = new TypedStateMachine({
        initialState: MyEnum.A,
        transitions: transitions
    });
});

describe("TypedStateMachine initialization", () => {

    it("Should NOT reference the given transitions array", () => {
        const transFun = tsm.getAllTransitions();

        expect(transFun).not.toBe(transitions);
        
        transitions.push(new Transition({
            from: MyEnum.A,
            to: MyEnum.F,
        }));

        transFun.push(new Transition({
            from: MyEnum.A,
            to: MyEnum.F,
        }));

        expect(tsm.getAllTransitions().length).toBe(3);
    });

    it("Should have default canSelfLoop to false", () => {
        expect(tsm.canSelfLoop).toBe(false);
    });

    it("Should return the initial state", () => {
        expect(tsm.getState()).toBe(MyEnum.A);
    });
});