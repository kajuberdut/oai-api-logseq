export function safeExecuteDecorator(errorMsg: string = "An error occurred") {
  return function (
    target: any, 
    propertyKey: string | symbol, 
    descriptor: TypedPropertyDescriptor<any>
  ): TypedPropertyDescriptor<any> {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (e) {
        logseq.App.showMsg(errorMsg, "warning");
        console.error(e);
        throw e; // Optional: rethrow if needed elsewhere
      }
    };

    return descriptor;
  };
}
