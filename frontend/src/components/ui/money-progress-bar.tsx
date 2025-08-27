import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface MoneyProgressBarProps {
  current: number;
  goal: number;
  className?: string;
  showValues?: boolean;
}

export const MoneyProgressBar = ({ 
  current, 
  goal, 
  className,
  showValues = true 
}: MoneyProgressBarProps) => {
  const percentage = Math.min((current / goal) * 100, 100);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Progress 
        value={percentage} 
        className="h-3"
      />
      {showValues && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className="font-medium text-primary">
            {formatCurrency(current)}
          </span>
          <span>
            {formatCurrency(goal)} ({Math.round(percentage)}%)
          </span>
        </div>
      )}
    </div>
  );
};