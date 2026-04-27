"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface DDContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DDContext = React.createContext<DDContextValue | null>(null);

const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <DDContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block text-left">{children}</div>
    </DDContext.Provider>
  );
};

interface DropdownMenuTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({ children, asChild, ...props }) => {
  const ctx = React.useContext(DDContext);
  return (
    <div onClick={() => ctx?.setOpen(!ctx.open)} {...props}>
      {children}
    </div>
  );
};

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({ className, align = "end", children, ...props }) => {
  const ctx = React.useContext(DDContext);
  if (!ctx?.open) return null;
  const alignClass = align === "end" ? "right-0" : align === "start" ? "left-0" : "left-1/2 -translate-x-1/2";
  return (
    <div
      className={cn(
        "absolute z-50 mt-2 min-w-[8rem] rounded-md border bg-popover p-1 shadow-md",
        alignClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const DropdownMenuItem: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, onClick, ...props }) => {
  const ctx = React.useContext(DDContext);
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={(e) => {
        onClick?.(e);
        ctx?.setOpen(false);
      }}
      {...props}
    />
  );
};

const DropdownMenuSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
);

const DropdownMenuLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("px-2 py-1.5 text-sm font-semibold", className)} {...props} />
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
