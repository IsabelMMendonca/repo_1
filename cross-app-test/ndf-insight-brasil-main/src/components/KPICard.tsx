import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "../lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "info" | "warning";
  className?: string;
}

const variantStyles = {
  default: "border-border",
  success: "border-l-4 border-l-success",
  info: "border-l-4 border-l-info",
  warning: "border-l-4 border-l-warning",
};

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  className,
}: KPICardProps) {
  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
