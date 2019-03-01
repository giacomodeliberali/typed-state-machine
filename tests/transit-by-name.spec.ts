import { ThreadStateType } from "./thread-state-type.enum";
import { TypedStateMachine } from "../src/typed-state-machine";
import { Transition } from "../src/models/transition.model";

/**
 * The typed machine under test
 */
let tsm: TypedStateMachine<ThreadStateType>;

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
                from: [
                    ThreadStateType.Running
                ],
                to: [
                    ThreadStateType.Waiting,
                    ThreadStateType.Terminated
                ],
                name: "step_stop()"
            }),
            new Transition({
                from: ThreadStateType.Waiting,
                to: ThreadStateType.Ready,
                name: "wake_up()"
            }),
            new Transition({
                from: ThreadStateType.Waiting,
                to: ThreadStateType.Terminated,
                name: "step_stop()"
            })
        ]
    }).initializeAsync();
});

describe("TypedStateMachine transitByName", () => {

    it("Should throw error if a invalid name is given", async () => {
        expect(tsm.transitByNameAsync("fake_name")).rejects.toEqual(new Error("The supplied transition name does not exist"));
    });

    it("Should pick transition that can be applied to current state", async () => {

        // Be careful that the FIST applicable transition is picked up!!

        expect(tsm.getState()).toEqual(ThreadStateType.New);

        await tsm.transitByNameAsync("wake_up()");

        expect(tsm.getState()).toEqual(ThreadStateType.Ready);

        await tsm.transitByNameAsync("schedule()");

        expect(tsm.getState()).toEqual(ThreadStateType.Running);

        await tsm.transitByNameAsync("step_stop()");

        expect(tsm.getState()).toEqual(ThreadStateType.Waiting);

        await tsm.transitByNameAsync("wake_up()");

        expect(tsm.getState()).toEqual(ThreadStateType.Ready);

        await tsm.transitByNameAsync("schedule()");

        expect(tsm.getState()).toEqual(ThreadStateType.Running);

        await tsm.transitByNameAsync("step_stop()");

        expect(tsm.getState()).toEqual(ThreadStateType.Waiting);

        await tsm.transitByNameAsync("step_stop()");

        expect(tsm.getState()).toEqual(ThreadStateType.Terminated);

    });


    it("Should call the onInvalidTransition when a existing name is not applicable", async () => {

        const onInvalidTransition = jest.fn();

        tsm.updateConfig({
            onInvalidTransition: onInvalidTransition
        });

        expect(tsm.getState()).toEqual(ThreadStateType.New);

        await tsm.transitByNameAsync("wake_up()");

        expect(tsm.getState()).toEqual(ThreadStateType.Ready);

        expect(onInvalidTransition).not.toHaveBeenCalled();

        await tsm.transitByNameAsync("wake_up()");

        expect(onInvalidTransition).toHaveBeenCalledTimes(1);

        tsm.updateConfig({
            onInvalidTransition: undefined
        });

        expect(await tsm.transitByNameAsync("wake_up()")).toEqual(false);

    });

});