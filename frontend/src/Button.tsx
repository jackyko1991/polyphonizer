/**
 * Buttons with Lucide icons, one look everywhere: h-9, the same radius and padding, 16 px icons with a 2 px stroke,
 * 6 px between icon and label. Icon-only buttons are square and always carry a label (aria-label and tooltip).
 * Musical signs in text (♩ ♯ ♭) stay as text: they are notation, not interface icons.
 */
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type Variant = "primary" | "secondary" | "ghost" | "on";

const BASE = "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm font-medium whitespace-nowrap disabled:opacity-40";
const VARIANT: Record<Variant, string> = {
  primary: "border border-(--lk-accent) bg-(--lk-accent) px-3 text-white hover:opacity-90",
  secondary: "border border-gray-300 bg-white px-2.5 text-gray-700 hover:bg-gray-50",
  ghost: "border border-transparent px-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  on: "border border-(--lk-accent) bg-(--lk-accent) px-2.5 text-white",
};

/** an icon at the standard size */
export const Icon = ({ icon: I, className = "" }: { icon: LucideIcon; className?: string }) => (
  <I className={`h-4 w-4 shrink-0 ${className}`} strokeWidth={2} aria-hidden />
);

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; variant?: Variant; children?: ReactNode };

/** a button with an optional icon before its label */
export function Button({ icon, variant = "secondary", className = "", children, type = "button", ...rest }: Props) {
  return (
    <button type={type} className={`${BASE} ${VARIANT[variant]} ${className}`} {...rest}>
      {icon && <Icon icon={icon} />}
      {children}
    </button>
  );
}

/** a square button with only an icon; `label` is its aria-label and tooltip */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  className = "",
  type = "button",
  ...rest
}: Omit<Props, "children"> & { icon: LucideIcon; label: string }) {
  return (
    <button type={type} aria-label={label} title={rest.title ?? label} className={`${BASE} ${VARIANT[variant]} w-9 px-0 ${className}`} {...rest}>
      <Icon icon={icon} />
    </button>
  );
}
