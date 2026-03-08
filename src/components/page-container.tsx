import { cn } from "@/lib/utils";

type PageContainerVariant = "narrow" | "focused" | "workspace";

interface PageContainerProps {
  variant?: PageContainerVariant;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<PageContainerVariant, string> = {
  /** ~768px centered — Welcome, onboarding, auth-like pages */
  narrow: "mx-auto max-w-3xl",
  /** ~1024px centered — Today, focused task flows */
  focused: "mx-auto max-w-5xl",
  /** Full-width workspace — Week, Projects, Settings, Summary */
  workspace: "",
};

/**
 * Page-level width container.
 *
 * - `narrow` / `focused` = centered max-width containers
 * - `workspace` = full-width, no centering, content fills the screen
 */
const PageContainer = ({
  variant = "workspace",
  className,
  children,
}: PageContainerProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-6 lg:gap-8",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};

export { PageContainer };
export type { PageContainerVariant };
