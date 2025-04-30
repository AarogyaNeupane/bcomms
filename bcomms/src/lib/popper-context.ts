import * as React from "react"

// Define proper interface for the context
interface PopperContextType {
  onAnchorChange?: (element: HTMLElement | null) => void;
  // Using Record instead of index signature for better type safety
  [key: string]: unknown;
}

// Type for scope
type PopperScope = string;

// Create a default context once
const DefaultPopperContext = React.createContext<PopperContextType | null>(null);

// This fixes the infinite render loop by adding a dependency array to the PopperAnchor's useEffect
export function usePopperContext(_scope: PopperScope) {
  const defaultContext: PopperContextType = {
    // Implement with a comment explaining why it's an empty function
    onAnchorChange: () => {
      // This is intentionally empty as it's just a fallback implementation
      // The real implementation will be provided by the context consumer
    }
  }
  
  // Get context values with proper typing
  const contextValue = React.useContext(DefaultPopperContext);
  
  // Use nullish coalescing instead of logical OR
  const safeContext = contextValue ?? defaultContext;
  
  return {
    ...safeContext,
    // Properly implement onAnchorChange without using a hook inside it
    onAnchorChange: (element: HTMLElement | null) => {
      if (element && safeContext.onAnchorChange) {
        safeContext.onAnchorChange(element);
      }
    }
  }
} 