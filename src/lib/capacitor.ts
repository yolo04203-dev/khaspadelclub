/**
 * Lightweight Capacitor runtime helpers.
 * Uses window.Capacitor so @capacitor/core stays out of the critical bundle.
 */

const cap = () => (window as any).Capacitor;

/** True when running inside a native iOS/Android shell */
export const isNative = (): boolean => !!cap()?.isNativePlatform?.();

/** Returns "ios" | "android" | "web" */
export const getPlatform = (): string => cap()?.getPlatform?.() ?? "web";
