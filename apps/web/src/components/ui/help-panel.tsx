"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface HelpPanelProps {
  title: string;
  steps: { label: string; description: string }[];
  defaultOpen?: boolean;
}

export function HelpPanel({ title, steps, defaultOpen = false }: HelpPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-accent/40 bg-accent/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-accent" />
            <p className="font-medium text-sm">{title}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {open && (
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            {steps.map((s, i) => (
              <li key={i}>
                <span className="font-medium text-foreground">{s.label}.</span>{" "}
                <span>{s.description}</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
