/**
 * S4-01: System Configuration Helpers
 * Type-safe access to system_config table values
 */

import { sql } from './connection';

export interface SystemConfig {
  key: string;
  value: any;
  description: string;
  updated_at: Date;
}

/**
 * Get a single config value by key
 * @throws Error if config key not found
 */
export async function getConfig(key: string): Promise<SystemConfig> {
  const result = await sql`
    SELECT key, value, description, updated_at 
    FROM system_config 
    WHERE key = ${key}
  `;

  if (result.length === 0) {
    throw new Error(`Config key not found: ${key}`);
  }

  return result[0] as SystemConfig;
}

/**
 * Get just the value for a config key
 * @throws Error if config key not found
 */
export async function getConfigValue<T = any>(key: string): Promise<T> {
  const config = await getConfig(key);
  return config.value;
}

/**
 * Get config value as number (common case for thresholds/timeouts)
 * @throws Error if config key not found or value not a number
 */
export async function getConfigNumber(key: string): Promise<number> {
  const value = await getConfigValue(key);
  const numValue =
    typeof value === 'number' ? value : parseInt(String(value), 10);

  if (isNaN(numValue)) {
    throw new Error(`Config key ${key} value is not a valid number: ${value}`);
  }

  return numValue;
}

/**
 * Get all config entries (for admin UI)
 */
export async function getAllConfigs(): Promise<SystemConfig[]> {
  const result = await sql`
    SELECT key, value, description, updated_at 
    FROM system_config 
    ORDER BY key
  `;

  return result as SystemConfig[];
}

/**
 * Update a config value (admin only - caller must check authorization)
 * Returns old and new values for event logging
 */
export async function updateConfig(
  key: string,
  newValue: any
): Promise<{ oldValue: any; newValue: any }> {
  // Fetch old value first
  const oldConfig = await getConfig(key);

  // Update value
  await sql`
    UPDATE system_config 
    SET value = ${JSON.stringify(newValue)}, updated_at = NOW() 
    WHERE key = ${key}
  `;

  return {
    oldValue: oldConfig.value,
    newValue,
  };
}
