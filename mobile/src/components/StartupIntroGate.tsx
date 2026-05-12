/**
 * TypeScript / tooling entry. Metro resolves `StartupIntroGate.web` (web) and
 * `StartupIntroGate.native` (iOS/Android) ahead of this file, so this re-export
 * is not used at runtime on those platforms.
 */
export { default } from './StartupIntroGate.native';
