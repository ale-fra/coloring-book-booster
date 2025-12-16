import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeForLog(data: any): any {
  if (!data) return data;

  // Handle strings
  if (typeof data === 'string') {
    // Truncate data URIs
    if (data.startsWith('data:image')) {
      return data.substring(0, 30) + '...[truncated data-uri]';
    }
    // No longer truncating generic long strings to preserve prompts
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
      if (['imageUrl', 'image', 'base64', 'src', 'url'].includes(key)) {
        const val = data[key];
        if (typeof val === 'string') {
          // Strong check for data URI
          if (val.startsWith('data:image')) {
            sanitized[key] = val.substring(0, 30) + '...[truncated data-uri]';
          } else if (val.length > 1000) {
            // Only truncate if it's absurdly long (likely base64 without prefix or very long token)
            // But keep it reasonably long to allow for signed URLs etc.
            sanitized[key] = val.substring(0, 30) + '...[truncated length]';
          } else {
            sanitized[key] = val;
          }
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
