import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeForLog(data: any): any {
  if (!data) return data;

  // Handle strings
  if (typeof data === 'string') {
    // Truncate data URIs or very long strings
    if (data.startsWith('data:image') || data.length > 500) {
      return data.substring(0, 20) + '...[truncated]';
    }
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLog(item));
  }

  // Handle objects
  if (typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      // Check for specific keys that might contain large data
      if (['imageUrl', 'image', 'base64'].includes(key)) {
        const val = data[key];
        if (typeof val === 'string' && val.length > 50) {
          sanitized[key] = val.substring(0, 20) + '...[truncated]';
        } else {
          sanitized[key] = sanitizeForLog(val);
        }
      } else {
        sanitized[key] = sanitizeForLog(data[key]);
      }
    }
    return sanitized;
  }

  return data;
}
