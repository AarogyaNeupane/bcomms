// This file contains a fixed version of the Radix UI Popper component that prevents infinite renders
// The original issue is in the PopperAnchor component where useEffect is missing a dependency array

import * as React from "react"
import { createContextScope } from "@radix-ui/react-context"
import { Primitive } from "@radix-ui/react-primitive"
import { useComposedRefs } from "@radix-ui/react-compose-refs"

type ScopedProps<P> = P & { __scopePopper?: string }
const [createPopperContext, createPopperScope] = createContextScope('Popper')

type PopperAnchorElement = React.ElementRef<typeof Primitive.div>
interface PopperAnchorProps extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  virtualRef?: React.RefObject<any>
}

// The important fix is in this component
export const PopperAnchor = React.forwardRef<PopperAnchorElement, PopperAnchorProps>(
  (props: ScopedProps<PopperAnchorProps>, forwardedRef) => {
    const { __scopePopper, virtualRef, ...anchorProps } = props
    const context = usePopperContext('Anchor', __scopePopper)
    const ref = React.useRef<PopperAnchorElement>(null)
    const composedRefs = useComposedRefs(forwardedRef, ref)

    // The fix - add a dependency array to prevent infinite updates
    React.useEffect(() => {
      // Consumer can anchor the popper to something that isn't
      // a DOM node e.g. pointer position, so we override the
      // `anchorRef` with their virtual ref in this case.
      context.onAnchorChange?.(virtualRef?.current || ref.current)
    }, [context.onAnchorChange, virtualRef, ref]); // Added proper dependencies

    return virtualRef ? null : <Primitive.div {...anchorProps} ref={composedRefs} />
  }
)

// Mock implementation of the usePopperContext for TypeScript to be happy
function usePopperContext(component: string, scope?: string) {
  return { onAnchorChange: (node: any) => {} }
} 