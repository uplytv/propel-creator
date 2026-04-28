declare global {
  interface Window {
    MusicKit?: {
      configure(config: {
        developerToken: string;
        app: { name: string; build: string };
      }): Promise<{ authorize(): Promise<string> }>;
      getInstance?: () => { authorize(): Promise<string> };
    };
  }
}
export {};
