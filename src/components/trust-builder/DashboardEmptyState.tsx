/**
 * Dashboard Empty State Component
 * Shown when member has no claims yet
 * S1-06: Made props optional for reuse in event ledger
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface DashboardEmptyStateProps {
  heading?: string;
  message?: string;
  primaryCta?: { text: string; href: string };
  secondaryCta?: { text: string; href: string } | null;
}

export default function DashboardEmptyState({
  heading = 'Start Your Trust Journey',
  message = "You haven't claimed any tasks yet. Complete tasks to earn trust points and contribute to Future's Edge missions!",
  primaryCta = { text: 'Browse Available Tasks', href: '/trust-builder/tasks' },
  secondaryCta = { text: 'View Event Log', href: '/trust-builder/events' },
}: DashboardEmptyStateProps = {}) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12 text-center">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-primary/10 p-3">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2">{heading}</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          {primaryCta && (
            <Button asChild size="lg">
              <a href={primaryCta.href}>{primaryCta.text}</a>
            </Button>
          )}
          {secondaryCta && (
            <Button asChild variant="outline" size="lg">
              <a href={secondaryCta.href}>{secondaryCta.text}</a>
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-6">
          Every task you complete builds trust and earns points toward role
          promotions
        </p>
      </CardContent>
    </Card>
  );
}
