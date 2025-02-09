export function logAndHandleErrorDecorator(errorMsg: string = "An error occurred") {
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
        logseq.UI.showMsg(errorMsg, "warning");
        console.error(e);
        throw e;
      }
    };

    return descriptor;
  };
}
