import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export const ChartCard = ({ title, subtitle, children, className, loading }: ChartCardProps) => {
  return (
    <div className={cn("bg-card rounded-xl border border-border p-6", className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : (
        children
      )}
    </div>
  );
};
