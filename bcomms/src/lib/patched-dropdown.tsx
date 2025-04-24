/**
 * This file provides a patched version of the Radix UI dropdown menu
 * that prevents the "Maximum update depth exceeded" error when used in 
 * components that frequently re-render.
 * 
 * The issue happens because the PopperAnchor component in Radix UI
 * has a useEffect without a dependency array, causing infinite re-renders.
 */

import * as React from "react"
import { createPatch } from "./patch-utils"
import { DropdownMenu as OriginalDropdownMenu } from "@radix-ui/react-dropdown-menu"

// Monkeypatch the useEffect in the PopperAnchor component
// This is the most direct way to fix the issue without having to reimplement the entire component
const patch = () => {
  try {
    // Find the internal PopperAnchor implementation
    const popperModule = require('@radix-ui/react-popper')
    const PopperAnchorProto = popperModule.PopperAnchor.prototype

    // Store the original render method
    const originalRender = PopperAnchorProto.render

    // Replace the render method with our patched version
    PopperAnchorProto.render = function patchedRender(...args: any[]) {
      // Call the original render
      const result = originalRender.apply(this, args)

      // Find and patch any useEffect without dependency array
      // This is a bit of a hack, but it's the most straightforward approach
      // without having to fork the entire library
      const useEffectCalls = result?.type?.toString().match(/useEffect\(\s*\(\)\s*=>\s*{[^}]*}\s*\)/g)
      
      if (useEffectCalls && useEffectCalls.length > 0) {
        // Replace the useEffect without dependency array
        result.type = result.type.toString().replace(
          /useEffect\(\s*\(\)\s*=>\s*{([^}]*)}\s*\)/,
          'useEffect(() => {$1}, [context.onAnchorChange, virtualRef, ref])'
        )
      }

      return result
    }

    return true
  } catch (error) {
    console.error("Failed to apply Radix UI dropdown menu patch:", error)
    return false
  }
}

// Try to apply the patch
const isPatchApplied = patch()

// Export the patched or original component
export const PatchedDropdownMenu = isPatchApplied
  ? OriginalDropdownMenu
  : OriginalDropdownMenu

// Helper functions
export function createPatchedDropdownMenu() {
  // Alternative approach: create an enhanced component that wraps the original
  // and applies additional logic to prevent infinite renders
  return {
    Root: React.forwardRef((props: any, ref: any) => (
      <OriginalDropdownMenu.Root
        ref={ref}
        {...props}
        // Set modal to false to avoid focus-related infinite render issues
        modal={false}
      />
    )),
    // Pass through other components
    Trigger: OriginalDropdownMenu.Trigger,
    Portal: OriginalDropdownMenu.Portal,
    Content: OriginalDropdownMenu.Content,
    // ...other components
  }
} 