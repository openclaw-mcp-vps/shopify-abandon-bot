export {};

declare global {
  interface Window {
    createLemonSqueezy?: () => void;
    LemonSqueezy?: {
      Setup: (config: {
        eventHandler?: (event: { event: string; data?: unknown }) => void;
      }) => void;
      Url: {
        Open: (url: string) => void;
      };
    };
  }
}
