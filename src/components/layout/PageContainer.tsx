import { cn } from "@/lib/utils";

type PageContainerProps = React.HTMLAttributes<HTMLElement>;

export function PageContainer({ className, ...props }: PageContainerProps) {
  return <div className={cn("container-page", className)} {...props} />;
}
