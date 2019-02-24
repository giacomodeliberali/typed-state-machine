# Typed State Machine

A library to describe finite state machine (aka DFA). 

<p align="center">
    <img src="./assets/threads_lifetime.gif" width="500px">
</p>

```typescript
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
                        handler: async (tsm) => {
                            // async support for promises
                            const canProceed = await asyncOperation(tsm.getState());
                            return canProceed;
                        }
                    },
                    {
                        hookType: StateHookType.OnAfterEnter,
                        handler: (tsm) => {
                            console.log("[OnAfterEnter]");
                            return true;
                        }
                    }
                ]
            }
        ],
        onAfterEveryTransition: (tsm) => {
            console.log("[onAfterEveryTransition]");
        },
        onInvalidTransition: (tsm, from, to) => {
            console.error(`[onInvalidTransition] ${from}->${to}`);
        }
    });
```

## Note

Please note that this project is under active development and is **not ready for use**.

## Roadmap
- Complete unit test
- Add support to decorate an enum
```typescript
    enum StateType {

        @Transition({
            to: [
                StateType.Inactive,
                StateType.Paused
            ]
        })
        Active,

        @Transition({ ... })
        Paused,

        @Transition({ ... })
        Inactive,

        @Transition({ ... })
        Stopped
    }

    const tsm = new TypedStateMachine(StateType);

    tsm.bindHook(StateType.A, (hookType: StateHookType) =>{
        if(hookType == StateHookType.OnBeforeLeave){
            // ...
        }
    });
```
- Add pluggable modules for visualization and history