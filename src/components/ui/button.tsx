import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, onClick, children, disabled, ...props }, ref) => {
    const [pressed, setPressed] = React.useState(false);
    const [pending, setPending] = React.useState(false);
    const timer = React.useRef<ReturnType<typeof setTimeout>>();
    React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
    const busy = loading || pending || pressed;
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (loading || pending || disabled) { event.preventDefault(); return; }
      setPressed(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setPressed(false), 450);
      const result: unknown = onClick?.(event);
      if (result && typeof (result as PromiseLike<unknown>).then === "function") {
        setPending(true);
        // Keep errors observable to the caller without leaving the control stuck.
        void Promise.resolve(result).finally(() => setPending(false)).catch(console.error);
      }
    };
    const content = (value: React.ReactNode) => <>
      <span className={cn("inline-flex items-center justify-center gap-2", busy && "invisible")}>{value}</span>
      {busy && <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true"><Loader2 className="animate-spin motion-reduce:animate-none" /></span>}
    </>;
    const Comp = asChild ? Slot : "button";
    const renderedChildren = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
      ? React.cloneElement(children, {}, content(children.props.children))
      : content(children);
    return <Comp className={cn(buttonVariants({ variant, size, className }), "relative")} ref={ref} {...props} disabled={disabled || loading || pending} aria-busy={busy} onClick={handleClick}>{renderedChildren}</Comp>;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
