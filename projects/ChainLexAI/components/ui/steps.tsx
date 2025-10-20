"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface StepItem {
  title: string;
  description?: string;
}

export interface StepsProps {
  current: number;
  direction?: "horizontal" | "vertical";
  progressDot?: boolean;
  items: StepItem[];
  className?: string;
}

export function Steps({
  current = 0,
  direction = "horizontal",
  progressDot = false,
  items = [],
  className,
}: StepsProps) {
  const isVertical = direction === "vertical";

  return (
    <div className={cn("flex", isVertical ? "flex-col" : "flex-row items-center", className)}>
      {items.map((item, index) => {
        const isActive = index === current;
        const isCompleted = index < current;
        const isLast = index === items.length - 1;

        return (
          <div
            key={index}
            className={cn(
              "flex",
              isVertical ? "flex-row" : "flex-col items-center",
              !isLast && isVertical && "mb-4",
              !isLast && !isVertical && "mr-6"
            )}
          >
            {/* Step indicator and connector column */}
            <div className={cn("flex", isVertical ? "flex-col items-center" : "flex-row items-center")}>
              {/* Step indicator */}
              <div className="flex items-center">
                {progressDot ? (
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full border-2 flex-shrink-0",
                      isCompleted || isActive
                        ? "border-primary bg-primary"
                        : "border-muted-foreground bg-background"
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium flex-shrink-0",
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : isActive
                        ? "border-primary bg-background text-primary"
                        : "border-muted-foreground bg-background text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "bg-muted-foreground/30",
                    isVertical ? "h-6 w-0.5" : "h-0.5 w-6"
                  )}
                />
              )}
            </div>

            {/* Step content */}
            <div className={cn(isVertical ? "ml-3 flex-1" : "mt-2 text-center")}>
              <div
                className={cn(
                  "text-sm font-medium",
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {item.title}
              </div>
              {item.description && (
                <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}