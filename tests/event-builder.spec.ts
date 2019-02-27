import { EventsBuilder } from "../src/helpers/events-builder.helper";

describe("EventBuilderConfig", () => {

    it("Should call event handler only after fire()", () => {
        const eventHandler = jest.fn();

        const builder = EventsBuilder.bind(eventHandler);

        expect(eventHandler).not.toHaveBeenCalled();

        builder.fire();

        expect(eventHandler).toHaveBeenCalledTimes(1);

    });

    it("Should call event handler with correct params", () => {

        const eventHandler = jest.fn();

        const builder = EventsBuilder
            .bind(eventHandler)
            .toArgs("1", ["2", "2"], "3");

        builder.fire();

        expect(eventHandler).toHaveBeenCalledWith([
            "1",
            ["2", "2"],
            "3"
        ]);

    });


    it("Should NOT call event handler if condition is falsy", () => {

        const eventHandler = jest.fn();

        const builder = EventsBuilder.bind(eventHandler);

        expect(eventHandler).not.toHaveBeenCalled();

        builder.fireIf(false);
        builder.fireIf(undefined);
        builder.fireIf(null);
        builder.fireIf(0 as any);

        expect(eventHandler).not.toHaveBeenCalled();

    });
});