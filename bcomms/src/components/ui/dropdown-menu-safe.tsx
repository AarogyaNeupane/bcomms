"use client"

/**
 * This component provides a safer version of the Radix UI dropdown menu
 * that prevents "Maximum update depth exceeded" errors that can occur
 * in components that frequently re-render.
 */

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react"

import { cn } from "~/lib/utils"

// A stable ref component for the Portal that ensures the dropdown content
// doesn't trigger re-renders during content animations or element dragging
function StablePortal({
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
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
    <DropdownMenuPrimitive.Portal {...props}>
      {children}
    </DropdownMenuPrimitive.Portal>
  )
}

// Export the safe dropdown menu components
export const SafeDropdownMenu = {
  Root: React.forwardRef((props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>, ref: React.Ref<HTMLDivElement>) => (
    <DropdownMenuPrimitive.Root 
      // Always set modal to false to avoid focus-related issues
      // that can cause infinite loops with FocusScope
      modal={false}
      {...props}
    />
  )),
  Trigger: DropdownMenuPrimitive.Trigger,
  // Use our stable portal implementation
  Portal: StablePortal,
  // Pre-compose the content with the portal
  Content: React.forwardRef(
    ({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>, ref: React.Ref<HTMLDivElement>) => (
      <StablePortal>
        <DropdownMenuPrimitive.Content
          ref={ref}
          sideOffset={sideOffset}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md",
            className
          )}
          {...props}
        />
      </StablePortal>
    )
  ),
  // Include the rest of the components
  Item: DropdownMenuPrimitive.Item,
  Group: DropdownMenuPrimitive.Group,
  Label: DropdownMenuPrimitive.Label,
  CheckboxItem: DropdownMenuPrimitive.CheckboxItem,
  RadioGroup: DropdownMenuPrimitive.RadioGroup,
  RadioItem: DropdownMenuPrimitive.RadioItem,
  ItemIndicator: DropdownMenuPrimitive.ItemIndicator,
  Separator: DropdownMenuPrimitive.Separator,
  Sub: DropdownMenuPrimitive.Sub,
  SubTrigger: DropdownMenuPrimitive.SubTrigger,
  SubContent: DropdownMenuPrimitive.SubContent,
} 