

// https://stackoverflow.com/questions/54927636/typescript-conditional-types-inferred-by-high-order-function/54928006#54928006

type SyncHookHandler = (context: MyClass<any>) => boolean;
type AsyncHookHandler = (context: MyClass<any>) => Promise<boolean>;
type HookHandler = AsyncHookHandler | SyncHookHandler;

class MyClass<HH extends HookHandler> {

    constructor(private handlers: Array<HH>) { }
  
    public invokeHandlers(): Promise<boolean> extends ReturnType<HH> ? Promise<boolean> : boolean;
    public invokeHandlers(): boolean | Promise<boolean> {
  
      const rets = this.handlers.map(h => h(this));
  
      const firstPromise = rets.find(r => typeof r !== 'boolean');
      if (firstPromise) {
        return firstPromise; // 🤷‍ what do you want to return here
      }
      // must be all booleans
      const allBooleanRets = rets as boolean[];
      return allBooleanRets.every(b => b);  // 🤷‍ what do you want to return here 
    }
  }

  async function ttt(){

    const myClassSync = new MyClass([
        (ctx) => true,
        (ctx) => false
      ]);
      // all handlers are sync, infer boolean
      const allHandlersAreOk = myClassSync.invokeHandlers()
      
      const myClassAsync = new MyClass([
        async (ctx) => Promise.resolve(true),
        async (ctx) => Promise.reject()
      ]);
      // all handlers are async, infer Promise<boolean>
      // note you do not "await" it, since you want a Promise
      const allAsyncHandlersAreOk = await myClassAsync.invokeHandlers()
      
      const myClassMix = new MyClass([
        async (ctx) => Promise.resolve(true),
        (ctx) => true
      ]);
      // at least one handler is async, infer Promise<boolean>
      // note you do not "await" it, since you want a Promise
      const allMixedHandlersAreOk = await myClassMix.invokeHandlers()

  }

