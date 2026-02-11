/**
 * Incentive Radar Chart Component (S3-02)
 *
 * Visualizes Trust Score breakdown across 5 incentive dimensions
 * Using Recharts RadarChart for clean, accessible visualization
 *
 * AC3: Radial chart visualizes 5 incentive dimensions
 * AC4: Chart data accurate (sums metadata.incentives[].points per type)
 * AC17: Radial chart legend displays dimension names + point values
 * AC23-24: Screen reader support with aria-label and companion data table
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface IncentiveDimension {
  name: string;
  points: number;
}

interface IncentiveRadarChartProps {
  data: IncentiveDimension[];
}

export default function IncentiveRadarChart({
  data,
}: IncentiveRadarChartProps) {
  // Transform data for Recharts (needs fullMark for proper scaling)
  const maxPoints = Math.max(...data.map((d) => d.points), 100);
  const chartData = data.map((dimension) => ({
    dimension: dimension.name,
    points: dimension.points,
    fullMark: maxPoints,
  }));

  // Accessibility: Create aria-label with full data
  const ariaLabel =
    data.length > 0
      ? `Trust Score breakdown: ${data.map((d) => `${d.name} ${d.points} points`).join(', ')}`
      : 'No Trust Score data yet';

  if (data.length === 0) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-muted-foreground mb-4">
          Complete your first task to see your Trust Score breakdown!
        </p>
        <a
          href="/trust-builder/tasks"
          className="inline-flex items-center text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-2"
        >
          Browse available tasks →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Radar Chart (visual) */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} aria-label={ariaLabel} role="img">
            <PolarGrid strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="dimension"
              className="text-sm"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, maxPoints]}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Radar
              name="Your Trust Score"
              dataKey="points"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.6}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* AC24: Screen reader accessible data table (strategic review HIGH priority) */}
      <div className="sr-only">
        <table>
          <caption>Trust Score Breakdown by Dimension</caption>
          <thead>
            <tr>
              <th>Dimension</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>{item.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* AC17: Legend with dimension names + point values (visible version) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
        {data.map((dimension) => (
          <div
            key={dimension.name}
            className="text-center p-3 bg-muted rounded-lg"
            aria-describedby={`dimension-${dimension.name}`}
          >
            <div
              id={`dimension-${dimension.name}`}
              className="font-semibold text-foreground"
            >
              {dimension.name}
            </div>
            <div className="text-2xl font-bold text-primary mt-1">
              {dimension.points}
            </div>
            <div className="text-xs text-muted-foreground">points</div>
          </div>
        ))}
      </div>
    </div>
  );
}
