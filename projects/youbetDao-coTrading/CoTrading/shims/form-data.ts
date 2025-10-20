// Browser-safe shim for axios-based openapi client when it imports 'form-data'.
// In the browser, the global FormData exists. For server or test, fall back to a minimal stub.

const GlobalFormData: any = (typeof FormData !== 'undefined')
  ? FormData
  : class FormDataStub { /* minimal */ } as any;

export default GlobalFormData;

