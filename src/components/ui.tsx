import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Box, Check, CircleAlert, Copy, LoaderCircle, X } from 'lucide-react';
import { useStore } from '../state';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <div className="brand"><span className="brand-mark"><Box size={20} strokeWidth={1.8} /></span>{!compact && <span>P5<span className="brand-sub">Agent Assurance</span></span>}</div>;
}

type Tone = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ tone = 'secondary', busy, className = '', children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; busy?: boolean }) {
  return <button type="button" className={`button button-${tone} ${className}`} disabled={disabled || busy} {...props}>{busy && <LoaderCircle size={15} className="spin" />}{children}</button>;
}

export function Action({ to, children, tone = 'secondary', className = '' }: { to: string; children: ReactNode; tone?: Tone; className?: string }) {
  return <Link to={to} className={`button button-${tone} ${className}`}>{children}</Link>;
}

export function Badge({ children, tone = 'neutral', dot = false }: { children: ReactNode; tone?: string; dot?: boolean }) {
  return <span className={`badge badge-${tone}`}>{dot && <i />}{children}</span>;
}

export function PageTitle({ title, description, actions, back, eyebrow }: { title: string; description: string; actions?: ReactNode; back?: { to: string; label: string }; eyebrow?: string }) {
  return <header className="page-title">
    <div>
      {back && <Link className="back-link" to={back.to}><ArrowLeft size={15} />{back.label}</Link>}
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1><p>{description}</p>
    </div>
    {actions && <div className="title-actions">{actions}</div>}
  </header>;
}

export function Panel({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>
    {(title || action) && <header className="panel-header"><div>{title && <h2>{title}</h2>}{description && <p>{description}</p>}</div>{action}</header>}
    {children}
  </section>;
}

export function Empty({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="empty"><span className="tile tile-indigo">{icon}</span><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'success' }) {
  return <div className={`notice notice-${tone}`}>{tone === 'success' ? <Check size={17} /> : <CircleAlert size={17} />}<div>{children}</div></div>;
}

export function InlineLink({ to, children }: { to: string; children: ReactNode }) {
  return <Link className="inline-link" to={to}>{children}<ArrowRight size={14} /></Link>;
}

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { notify } = useStore();
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return <Button tone="ghost" className="icon-button copy-button" title={copied ? 'Copied' : label} aria-label={copied ? 'Copied' : label} onClick={async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); }
    catch { notify('Clipboard access is unavailable. Select the example text to copy it.', 'error'); }
  }}>{copied ? <Check size={15} /> : <Copy size={15} />}</Button>;
}

export function Modal({ title, label, children, onClose, className = '' }: { title: string; label?: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} aria-label={title} className={`modal ${className}`} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === ref.current) onClose(); }}>
    <div className="modal-inner">
      <header className="modal-header"><h2>{title}</h2><Button tone="ghost" className="icon-button" aria-label={label ?? 'Close dialog'} onClick={onClose}><X size={20} /></Button></header>
      {children}
    </div>
  </dialog>;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date(value));
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(value));
}

export function usePending() {
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } catch { /* The store displays the error. */ } finally { setBusy(false); }
  };
  return { busy, run };
}
