/// <reference types="vite/client" />

/** Short commit of the build on screen; see `commitRef` in vite.config.ts. */
declare const __COMMIT__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_API_TARGET?: string;
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
