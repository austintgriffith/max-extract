import { useEffect } from "react";
import { usePlaceholder } from "./usePlaceholder";

/**
 * Hook that redirects to home page with hard reload when placeholder becomes active
 * Used on protected pages to automatically redirect users during maintenance mode
 * Polls every 20 seconds and redirects immediately if placeholder is set
 */
export const usePlaceholderRedirect = () => {
  const { placeholder, isLoading } = usePlaceholder();

  useEffect(() => {
    // Don't redirect while loading initial data
    if (isLoading) return;

    // If placeholder is set (not empty string), redirect to home with hard reload
    if (placeholder && placeholder.trim() !== "") {
      window.location.href = "/";
    }
  }, [placeholder, isLoading]);
};
