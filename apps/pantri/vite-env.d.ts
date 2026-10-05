/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PANTRI_GIT_SHA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
