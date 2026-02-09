/**
 * Trust Score Card Component
 * Displays member's total trust score and dimension breakdown chart
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrustScoreCardProps {
  totalScore: number;
  dimensions: Record<string, number>;
  memberId: string;
}

export default function TrustScoreCard({
  totalScore,
  dimensions,
  memberId,
}: TrustScoreCardProps) {
  // Transform dimensions record to chart data format
  const chartData = Object.entries(dimensions).map(([name, points]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
    points,
  }));

  // Sort by points descending for better visual hierarchy
  chartData.sort((a, b) => b.points - a.points);

  const hasDimensions = chartData.length > 0 && totalScore > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">Trust Score</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Member ID:{' '}
              <span className="font-mono font-semibold">{memberId}</span>
              <span
                className="ml-2 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400"
                title="Your Member ID is your permanent identity in Future's Edge. When we launch on blockchain in April 2026, this ID proves your founding contribution and links to your wallet."
              >
                Founding Member
              </span>
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-primary">{totalScore}</div>
            <div className="text-sm text-muted-foreground">points</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {hasDimensions ? (
          <>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground">
              Dimension Breakdown
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar
                    dataKey="points"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">
              Complete tasks to earn trust points and see your dimension
              breakdown here.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
