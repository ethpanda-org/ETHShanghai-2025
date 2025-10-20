import * as React from "react";
import { cn } from "@/lib/utils";

const Separator = ({ className, orientation = "horizontal", decorative = false, ...props }: React.HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}) => (
  <div
    role={decorative ? "none" : "separator"}
    aria-orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...props}
  />
);

Separator.displayName = "Separator";

export { Separator };
