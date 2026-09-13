import type { H3Event } from 'h3';
import { createError } from 'h3';

type D1Primitive = string | number | null | boolean | ArrayBuffer;

export interface D1PreparedStatement {
  bind(...values: D1Primitive[]): D1PreparedStatement;
  first<T = unknown>(column?: string): Promise<T | null>;
  all<T = unknown>(): Promise<{ results?: T[] }>;
  run<T = unknown>(): Promise<T>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

interface CloudflareEventContext {
  env?: Record<string, unknown>;
}

const D1_BINDING_NAME = 'DB';

export function useD1Database(event: H3Event): D1Database {
  const context = event.context as { cloudflare?: CloudflareEventContext };
  const cloudflare = context.cloudflare;
  const db = cloudflare?.env?.[D1_BINDING_NAME];

  if (!db) {
    throw createError({
      statusCode: 500,
      statusMessage: `D1 binding "${D1_BINDING_NAME}" is not configured.`,
    });
  }

  return db as D1Database;
}
