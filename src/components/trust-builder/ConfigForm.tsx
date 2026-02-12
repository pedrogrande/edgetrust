/**
 * S4-01: Admin Configuration Form
 * Single-column form pattern for system config management
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface SystemConfig {
  key: string;
  value: any;
  description: string;
  updated_at: string;
}

/**
 * Format config key for display
 * claim_timeout_days → Claim Timeout (Days)
 */
function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/Days$/i, '(Days)')
    .replace(/Threshold$/i, 'Threshold');
}

/**
 * Extract unit from config key for input context
 * claim_timeout_days → days
 */
function extractUnit(key: string): string {
  if (key.includes('days')) return 'days';
  if (key.includes('threshold')) return 'Trust Score';
  return '';
}

export function ConfigForm() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Fetch current config on mount
  useEffect(() => {
    fetch('/api/trust-builder/admin/config')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to fetch configurations');
        }
        return res.json();
      })
      .then((data) => {
        setConfigs(data.configs);

        // Initialize form values
        const initialValues: Record<string, string> = {};
        data.configs.forEach((config: SystemConfig) => {
          initialValues[config.key] = String(config.value);
        });
        setValues(initialValues);

        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching configs:', error);
        toast({
          title: 'Failed to load configurations',
          description: 'Please refresh the page to try again.',
          variant: 'destructive',
        });
        setLoading(false);
      });
  }, [toast]);

  const handleSave = async (key: string) => {
    const newValue = parseInt(values[key], 10);

    // Validation
    if (isNaN(newValue) || newValue < 1) {
      toast({
        title: 'Invalid value',
        description: 'Please enter a positive number.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(key);

    try {
      const response = await fetch('/api/trust-builder/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: newValue }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update configuration');
      }

      // Update local state
      setConfigs((prev) =>
        prev.map((config) =>
          config.key === key
            ? {
                ...config,
                value: newValue,
                updated_at: new Date().toISOString(),
              }
            : config
        )
      );

      toast({
        title: 'Configuration updated successfully',
        description: `${formatKey(key)} is now set to ${newValue}`,
      });
    } catch (error) {
      console.error('Error updating config:', error);
      toast({
        title: 'Failed to update configuration',
        description:
          error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleInputChange = (key: string, newValue: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: newValue,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {configs.map((config) => {
        const unit = extractUnit(config.key);
        const hasChanged = String(config.value) !== values[config.key];

        return (
          <div key={config.key} className="space-y-2">
            <Label htmlFor={config.key} className="text-base font-medium">
              {formatKey(config.key)}
            </Label>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Input
                  id={config.key}
                  type="number"
                  min="1"
                  value={values[config.key] || ''}
                  onChange={(e) =>
                    handleInputChange(config.key, e.target.value)
                  }
                  className="w-full"
                  disabled={saving === config.key}
                />
              </div>

              {unit && (
                <span className="text-sm text-muted-foreground min-w-[80px]">
                  {unit}
                </span>
              )}

              {hasChanged && (
                <Button
                  type="button"
                  onClick={() => handleSave(config.key)}
                  disabled={saving === config.key}
                  size="sm"
                  className="min-w-[80px]"
                >
                  {saving === config.key ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {config.description}
            </p>

            {config.updated_at && (
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(config.updated_at).toLocaleString()}
              </p>
            )}
          </div>
        );
      })}

      <div className="pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          💡 Changes are saved individually. Modify a value and click Save to
          update it.
        </p>
      </div>
    </div>
  );
}
