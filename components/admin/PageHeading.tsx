import type { ReactNode } from "react";
import { Flower2, Loader2 } from "lucide-react";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="admin-page-heading">
      <div>
        <p className="admin-eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <Flower2 size={24} aria-hidden="true" />
        </h1>
        <p className="admin-page-description">{description}</p>
      </div>
      {children && <div className="admin-heading-actions">{children}</div>}
    </header>
  );
}
export function PanelState({
  loading,
  title,
  children,
}: {
  loading?: boolean;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-panel-state" role={loading ? "status" : undefined}>
      {loading ? (
        <Loader2 className="animate-spin" size={25} />
      ) : (
        <Flower2 size={30} />
      )}
      <h3>{title}</h3>
      {children}
    </div>
  );
}
