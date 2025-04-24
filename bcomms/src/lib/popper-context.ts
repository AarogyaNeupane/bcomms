import * as React from "react"

// This fixes the infinite render loop by adding a dependency array to the PopperAnchor's useEffect
export function usePopperContext(scope: string, context?: any) {
  const originalContext = React.useContext(
    context || {
      onAnchorChange: () => {}
    }
  )

  const { onAnchorChange } = originalContext

  return {
    ...originalContext,
    onAnchorChange: (element: any) => {
      // Prevent excessive re-renders by debouncing the callback
      React.useEffect(() => {
        if (element) {
          onAnchorChange(element)
        }
      }, [element, onAnchorChange])
    }
  }
} 