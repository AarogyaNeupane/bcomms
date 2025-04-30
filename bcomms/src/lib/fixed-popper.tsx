// This file contains a fixed version of the Radix UI Popper component that prevents infinite renders
// The original issue is in the PopperAnchor component where useEffect is missing a dependency array

import * as React from "react"
import { Primitive } from "@radix-ui/react-primitive"
import { useComposedRefs } from "@radix-ui/react-compose-refs"
import { usePopperContext } from "./popper-context"

type ScopedProps<P> = P & { __scopePopper?: string }
// Remove unused variables
// const [createPopperContext, createPopperScope] = createContextScope('Popper')

type PopperAnchorElement = React.ElementRef<typeof Primitive.div>
interface PopperAnchorProps extends React.ComponentPropsWithoutRef<typeof Primitive.div> {
  virtualRef?: React.RefObject<HTMLElement>; // Properly typed instead of any
}

// The important fix is in this component
export const PopperAnchor = React.forwardRef<PopperAnchorElement, PopperAnchorProps>(
  (props: ScopedProps<PopperAnchorProps>, forwardedRef) => {
    // Destructure props but omit unused __scopePopper
    const { virtualRef, ...anchorProps } = props
    const context = usePopperContext('Anchor')
    const ref = React.useRef<PopperAnchorElement>(null)
    const composedRefs = useComposedRefs(forwardedRef, ref)

    // The fix - add a dependency array to prevent infinite updates
    React.useEffect(() => {
      // Consumer can anchor the popper to something that isn't
      // a DOM node e.g. pointer position, so we override the
      // `anchorRef` with their virtual ref in this case.
      context.onAnchorChange?.(virtualRef?.current ?? ref.current) // Use nullish coalescing
    }, [context, virtualRef, ref]); // Added context to dependency array

    return virtualRef ? null : <Primitive.div {...anchorProps} ref={composedRefs} />
  }
)

// Add display name
PopperAnchor.displayName = 'PopperAnchor';

// Remove the mock implementation since we're now importing the real one from popper-context.ts 