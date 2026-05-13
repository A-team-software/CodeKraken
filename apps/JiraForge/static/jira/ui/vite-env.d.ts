/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV_MODE?: string;
  readonly SERVE_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __APP_RELEASE__: string | undefined;
