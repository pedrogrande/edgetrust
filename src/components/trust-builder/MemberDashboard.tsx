/**
 * MemberDashboard Component (S3-02)
 *
 * Main dashboard container that:
 * - Fetches dashboard data from API
 * - Renders Trust Score card, radial chart, claim history, progress bar
 * - Handles loading and error states
 *
 * AC1: Dashboard displays member's Trust Score within 2s page load
 * AC16: Mobile responsive
 * AC20: Empty state for new members
 * AC21-22: Keyboard navigable with focus indicators
 */

import { useState, useEffect } from 'react';
import TrustScoreCard from './TrustScoreCard';
import IncentiveRadarChart from './IncentiveRadarChart';
import ClaimHistoryTable from './ClaimHistoryTable';
import ProgressToSteward from './ProgressToSteward';
import DashboardEmptyState from './DashboardEmptyState';
import RoleBadge from './RoleBadge';
import PromotionToast from './PromotionToast';
interface DashboardData {
  member: {
    id: string;
    memberId: string;
    displayName: string | null;
    role: string;
    email: string;
  };
  trustScore: number;
  incentiveBreakdown: Array<{
    name: string;
    points: number;
  }>;
  claimHistory: Array<{
    id: string;
    taskTitle: string;
    missionName: string;
    status: string;
    submittedAt: string;
    reviewedAt: string | null;
    incentives: Array<{
      name: string;
      points: number;
    }>;
  }>;
  progressToNextRole: {
    currentRole: string;
    nextRole: string | null;
    currentScore: number;
    targetScore: number | null;
    percentage: number;
  } | null;
}

export default function MemberDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTime, setLoadTime] = useState<number | null>(null);

  useEffect(() => {
    const startTime = Date.now();

    fetch('/api/trust-builder/dashboard/me')
      .then((res) => {
        const loadTimeMs = Date.now() - startTime;
        setLoadTime(loadTimeMs);

        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/trust-builder/signin';
            throw new Error('Unauthorized');
          }
          throw new Error('Failed to load dashboard');
        }
        return res.json();
      })
      .then((dashboardData) => {
        setData(dashboardData);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Dashboard load error:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                My Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">Loading your data...</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card p-6 rounded-lg border animate-pulse h-48" />
            <div className="bg-card p-6 rounded-lg border animate-pulse h-48" />
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                My Dashboard
              </h1>
            </div>
          </div>
          <div className="bg-destructive/10 border border-destructive/50 text-destructive p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">
              Could not load dashboard
            </h2>
            <p className="text-sm">{error}</p>
            <p className="text-sm mt-2">
              Please try refreshing the page. If this persists, contact support.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  // AC20: Empty state for new members (no claims yet)
  if (data.trustScore === 0 && data.claimHistory.length === 0) {
    return (
      <main className="min-h-screen bg-background p-4 sm:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                My Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Welcome, {data.member.displayName || data.member.memberId}!
              </p>
            </div>
            <form action="/api/trust-builder/auth/signout" method="POST">
              <button
                type="submit"
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Sign Out
              </button>
            </form>
          </div>
          <DashboardEmptyState />
        </div>
      </main>
    );
  }

  return (
    <main
      id="dashboard-content"
      className="min-h-screen bg-background p-4 sm:p-8"
      tabIndex={-1}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              My Dashboard
            </h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2 flex-wrap">
              <span>{data.member.displayName || data.member.memberId}</span>
              <span>•</span>
              <RoleBadge role={data.member.role} />
              {loadTime && loadTime < 2000 && (
                <span className="text-xs text-green-600">
                  Loaded in {loadTime}ms
                </span>
              )}
            </p>
          </div>
          <form action="/api/trust-builder/auth/signout" method="POST">
            <button
              type="submit"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              Sign Out
            </button>
          </form>
        </div>

        {/* S3-04: Promotion toast (AC11) */}
        <PromotionToast role={data.member.role} memberId={data.member.id} />

        {/* Trust Score & Progress */}
        <section
          aria-labelledby="trust-score-heading"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <TrustScoreCard
            trustScore={data.trustScore}
            role={data.member.role}
          />
          {data.progressToNextRole && (
            <ProgressToSteward progress={data.progressToNextRole} />
          )}
        </section>

        {/* Incentive Breakdown */}
        <section aria-labelledby="breakdown-heading">
          <h2 id="breakdown-heading" className="text-2xl font-bold mb-4">
            Trust Score Breakdown
          </h2>
          <div className="bg-card p-6 rounded-lg border">
            <IncentiveRadarChart data={data.incentiveBreakdown} />
          </div>
        </section>

        {/* Claim History */}
        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="text-2xl font-bold mb-4">
            Claim History
          </h2>
          <ClaimHistoryTable claims={data.claimHistory} />
        </section>
      </div>
    </main>
  );
}
