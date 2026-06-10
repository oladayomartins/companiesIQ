// Tiny event-based toast bus. Any client component can call `toast(...)`; the
// single <Toaster /> mounted in the root layout subscribes and renders. No
// context/provider plumbing needed — works from anywhere in the client bundle.

export type ToastTone = "success" | "error" | "info" | "pending";

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  duration: number; // ms; 0 = sticky until dismissed
}

type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let counter = 0;

export function toast(message: string, opts: { tone?: ToastTone; duration?: number } = {}): number {
  const tone = opts.tone ?? "success";
  const item: ToastItem = {
    id: ++counter,
    message,
    tone,
    duration: opts.duration ?? (tone === "error" ? 5000 : 3200),
  };
  listeners.forEach((l) => l(item));
  return item.id;
}

export function onToast(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
