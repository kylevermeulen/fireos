import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCompactCurrency } from '@/lib/format';
import { FireMetrics } from '@/hooks/useFireCalculations';
import { Flame, Target, TrendingUp, Calendar } from 'lucide-react';

interface FireProgressCardProps {
  metrics: FireMetrics;
}

export function FireProgressCard({ metrics }: FireProgressCardProps) {
  const progressPercent = Math.min(100, metrics.fiPercent);
  const remaining = Math.max(0, metrics.fiNumber - metrics.investableAssets);
  
  const yearsToFiText = metrics.yearsToFi !== null 
    ? metrics.yearsToFi === 0 
      ? 'FI Achieved! 🎉' 
      : `${metrics.yearsToFi.toFixed(1)} years`
    : 'N/A';

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Financial Independence Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to FI</span>
            <span className="font-medium">{metrics.fiPercent.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercent} className="h-4" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCompactCurrency(metrics.investableAssets)}</span>
            <span>{formatCompactCurrency(metrics.fiNumber)}</span>
          </div>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Target className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <div className="text-xs text-muted-foreground">FI Number</div>
            <div className="font-semibold">{formatCompactCurrency(metrics.fiNumber)}</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-semibold">{formatCompactCurrency(remaining)}</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-purple-500" />
            <div className="text-xs text-muted-foreground">Years to FI</div>
            <div className="font-semibold">{yearsToFiText}</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <div className="text-xs text-muted-foreground">Annual Spend</div>
            <div className="font-semibold">{formatCompactCurrency(metrics.annualizedSpend)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
