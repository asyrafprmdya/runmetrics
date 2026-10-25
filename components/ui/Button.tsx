import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const BASE =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-bg hover:bg-[#d4f78c]",
  secondary: "border border-line bg-surface text-ink hover:bg-elevated",
  danger: "border border-bad/60 bg-surface text-bad hover:bg-elevated",
  ghost: "text-muted hover:bg-elevated hover:text-ink",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ variant = "secondary", icon, children, className = "", type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

interface ButtonLinkProps {
  href: string;
  variant?: Variant;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function ButtonLink({ href, variant = "secondary", children, icon, className = "" }: ButtonLinkProps) {
  return (
    <Link href={href} className={`${BASE} ${VARIANTS[variant]} ${className}`}>
      {icon}
      {children}
    </Link>
  );
}
