import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
  {
    variants: {
      variant: {
        default: "bg-sky-500 text-black hover:bg-sky-400",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700",
        ghost: "bg-transparent text-zinc-100 hover:bg-zinc-800"
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-12 px-6 text-base",
        sm: "h-9 px-3"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
