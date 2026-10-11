import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-left text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("whitespace-nowrap border-b border-line px-4 py-2.5 text-xs font-semibold text-muted", className)} {...props} />;
}
export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b border-line/70 px-4 py-3 align-middle", className)} {...props} />;
}
export function Tr({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("last:[&>td]:border-b-0", className)} {...props} />;
}
