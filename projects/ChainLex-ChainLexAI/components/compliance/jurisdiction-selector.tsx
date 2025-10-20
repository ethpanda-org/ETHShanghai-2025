"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Jurisdiction {
  id: string;
  name: string;
  code: string;
  flagCode: string;
}

const JURISDICTIONS: Jurisdiction[] = [
  { id: "hk", name: "Hong Kong", code: "HK", flagCode: "HK" },
  { id: "sg", name: "Singapore", code: "SG", flagCode: "SG" },
  { id: "us", name: "United States", code: "US", flagCode: "US" },
  { id: "ae", name: "United Arab Emirates", code: "AE", flagCode: "AE" },
  { id: "more", name: "More Coming Soon", code: "COMING", flagCode: "US" },
];

// 简化的Flag组件，使用静态导入
import dynamic from 'next/dynamic';

const FlagIcon = dynamic(() => import('react-flag-kit').then((mod) => mod.FlagIcon), {
  ssr: false,
  loading: () => <div className="bg-muted rounded-full h-4 w-4" />
});

interface JurisdictionSelectorProps {
  selectedJurisdiction: string | null;
  onJurisdictionChange: (jurisdictionId: string) => void;
}

export function JurisdictionSelector({
  selectedJurisdiction,
  onJurisdictionChange
}: JurisdictionSelectorProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Select Jurisdiction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {JURISDICTIONS.map((jurisdiction) => {
            const isMoreOption = jurisdiction.id === "more";
            return (
              <Button
                key={jurisdiction.id}
                variant={selectedJurisdiction === jurisdiction.id ? "default" : "outline"}
                className={cn(
                  "h-auto flex flex-row items-center justify-center gap-2 py-2 px-3 rounded-lg min-w-[140px]",
                  selectedJurisdiction === jurisdiction.id && "ring-2 ring-primary ring-offset-2",
                  isMoreOption && "opacity-60 cursor-not-allowed"
                )}
                onClick={() => !isMoreOption && onJurisdictionChange(jurisdiction.id)}
                disabled={isMoreOption}
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  {isMoreOption ? (
                    <span className="text-xs text-muted-foreground">...</span>
                  ) : (
                    <FlagIcon code={jurisdiction.flagCode} size={16} className="h-4 w-4 rounded-full object-cover" />
                  )}
                </div>
                <span className="text-xs font-medium text-center flex-1">{jurisdiction.name}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}