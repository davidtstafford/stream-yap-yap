// Type definitions for window.api and window.electron
export interface IElectronAPI {
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, callback: Function) => () => void;
}

declare global {
  interface Window {
    api: IElectronAPI;
    electron: {
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, callback: Function) => () => void;
    };
  }
}

export {};
