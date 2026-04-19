export type ToastKind = "error" | "success";

export type ToastEventDetail = {
  type: ToastKind;
  title?: string;
  message: string;
};

export const CITYZEN_TOAST_EVENT = "cityzen:toast";

export function pushToast(detail: ToastEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastEventDetail>(CITYZEN_TOAST_EVENT, { detail }));
}
