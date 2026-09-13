/**
 * Wire types for the explorer backend, and the client interface over them.
 *
 * Every DTO the backend speaks lives under this folder, split by what it
 * describes — there is no second types module. Import them through `@/api`,
 * not from these files directly.
 */

export * from "./assets";
export type * from "./client";
export * from "./custody";
export * from "./flows";
export * from "./privacy";
export * from "./transactions";
