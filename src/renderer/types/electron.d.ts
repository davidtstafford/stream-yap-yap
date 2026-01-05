// Type definitions for window.api
export interface IElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: Function) => () => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}

export {};
