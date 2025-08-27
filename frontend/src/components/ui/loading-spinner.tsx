import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-solid border-current border-r-transparent align-[-0.125em]",
        {
          "h-4 w-4 border-2": size === "sm",
          "h-6 w-6 border-2": size === "md", 
          "h-8 w-8 border-4": size === "lg",
        },
        className
      )}
      role="status"
    >
      <span className="sr-only">Carregando...</span>
    </div>
  );
};