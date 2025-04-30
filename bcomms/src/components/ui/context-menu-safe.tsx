"use client"

/**
 * This component provides a safer version of the Radix UI context menu
 * that prevents "Maximum update depth exceeded" errors that can occur
 * in components that frequently re-render or during drag operations.
 */

import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"

import { cn } from "~/lib/utils"

// A stable ref component for the Portal that ensures the context menu content
// doesn't trigger re-renders during content animations or element dragging
function StablePortal({
  children,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Portal>) {
  // Use a ref instead of state to prevent re-renders when mounted changes
  const mountedRef = React.useRef(false)
  const [mounted, setMounted] = React.useState(false)
  
  // Handle mounting once to prevent re-renders
  // Using an empty dependency array ensures this only runs once
  React.useEffect(() => {
    mountedRef.current = true
    setMounted(true)
    return () => {
      mountedRef.current = false
      setMounted(false)
    }
  }, [])
  
  if (!mounted) return null
  
  return (
    <ContextMenuPrimitive.Portal {...props}>
      {children}
    </ContextMenuPrimitive.Portal>
  )
}

// Export the safe context menu components
export const SafeContextMenu = {
  Root: React.forwardRef<HTMLDivElement, React.ComponentProps<typeof ContextMenuPrimitive.Root>>((props, _ref) => (
    <ContextMenuPrimitive.Root 
      // Always set modal to false to avoid focus-related issues
      // that can cause infinite loops with FocusScope
      modal={false}
      {...props}
    />
  )),
  Trigger: ContextMenuPrimitive.Trigger,
  // Use our stable portal implementation
  Portal: StablePortal,
  // Pre-compose the content with the portal
  Content: React.forwardRef<HTMLDivElement, React.ComponentProps<typeof ContextMenuPrimitive.Content>>(
    ({ className, ...props }, _ref) => (
      <StablePortal>
        <ContextMenuPrimitive.Content
          ref={_ref}
          className={cn(
            "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
            className
          )}
          {...props}
        />
      </StablePortal>
    )
  ),
  // Include the rest of the components
  Item: ContextMenuPrimitive.Item,
  Group: ContextMenuPrimitive.Group,
  Label: ContextMenuPrimitive.Label,
  CheckboxItem: ContextMenuPrimitive.CheckboxItem,
  RadioGroup: ContextMenuPrimitive.RadioGroup,
  RadioItem: ContextMenuPrimitive.RadioItem,
  ItemIndicator: ContextMenuPrimitive.ItemIndicator,
  Separator: ContextMenuPrimitive.Separator,
  Sub: ContextMenuPrimitive.Sub,
  SubTrigger: ContextMenuPrimitive.SubTrigger,
  SubContent: ContextMenuPrimitive.SubContent,
}

// Add display names
SafeContextMenu.Root.displayName = "SafeContextMenuRoot"
SafeContextMenu.Content.displayName = "SafeContextMenuContent" 