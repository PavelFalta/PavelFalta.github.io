import toast, { Toast, ToastOptions, ToastType, ToastPosition } from 'react-hot-toast';

// Type for toast instance with ID
interface ToastInstance {
  id: string;
  type: ToastType;
  position: ToastPosition;
  message: string | React.ReactNode;
  createdAt: number;
}

// Track active toasts to implement our limiting logic
let activeToasts: string[] = [];
const MAX_TOASTS = 6;

// Helper to remove a toast ID from our tracking array
const removeToastId = (id: string) => {
  activeToasts = activeToasts.filter(toastId => toastId !== id);
};

// Custom toast handlers that limit the number of concurrent toasts
const enhancedToast = {
  success: (message: string, options?: ToastOptions) => {
    if (activeToasts.length >= MAX_TOASTS) {
      // Dismiss the oldest toast to make room for the new one
      const oldestToastId = activeToasts[0];
      toast.dismiss(oldestToastId);
      removeToastId(oldestToastId);
    }
    
    const id = toast.success(message, {
      ...options,
    });
    
    // Register callback to remove from our tracking array when dismissed
    activeToasts.push(id);
    return id;
  },
  
  error: (message: string, options?: ToastOptions) => {
    if (activeToasts.length >= MAX_TOASTS) {
      // For errors, prioritize showing them by dismissing a success toast if possible
      const successToastId = activeToasts.find(id => {
        // Find success toasts - can't easily check toast types, so we'll just use the oldest
        return activeToasts.indexOf(id) < activeToasts.length - 1;
      });
      
      if (successToastId) {
        toast.dismiss(successToastId);
        removeToastId(successToastId);
      } else {
        // If no success toast, dismiss the oldest
        const oldestToastId = activeToasts[0];
        toast.dismiss(oldestToastId);
        removeToastId(oldestToastId);
      }
    }
    
    const id = toast.error(message, {
      ...options,
    });
    
    activeToasts.push(id);
    return id;
  },
  
  loading: (message: string, options?: ToastOptions) => {
    if (activeToasts.length >= MAX_TOASTS) {
      // Dismiss the oldest toast to make room
      const oldestToastId = activeToasts[0];
      toast.dismiss(oldestToastId);
      removeToastId(oldestToastId);
    }
    
    const id = toast.loading(message, {
      ...options,
    });
    
    activeToasts.push(id);
    return id;
  },
  
  // Provide direct access to dismiss method
  dismiss: (id?: string) => {
    if (id) {
      removeToastId(id);
    }
    return toast.dismiss(id);
  },
  
  // Add a method to clear all toasts
  clearAll: () => {
    toast.dismiss();
    activeToasts = [];
  }
};

export default enhancedToast; 