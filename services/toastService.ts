
type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

type ToastListener = (toast: ToastMessage) => void;

class ToastService {
  private listeners: ToastListener[] = [];

  subscribe(listener: ToastListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(type: ToastType, title: string, message: string, duration = 5000) {
    const toast: ToastMessage = {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      duration
    };
    this.listeners.forEach(l => l(toast));
  }

  success(title: string, message?: string) {
    if (message === undefined) {
      this.notify('success', 'Success', title);
    } else {
      this.notify('success', title, message);
    }
  }

  error(title: string, message?: string) {
    if (message === undefined) {
      this.notify('error', 'Error', title);
    } else {
      this.notify('error', title, message);
    }
  }

  info(title: string, message?: string) {
    if (message === undefined) {
      this.notify('info', 'Info', title);
    } else {
      this.notify('info', title, message);
    }
  }

  warning(title: string, message?: string) {
    if (message === undefined) {
      this.notify('warning', 'Warning', title);
    } else {
      this.notify('warning', title, message);
    }
  }
}

export const toast = new ToastService();
export const toastService = toast;
