# Fixing Radix UI "Maximum Update Depth Exceeded" Errors

This document explains the solution to the "Maximum update depth exceeded" errors that can occur when using Radix UI components, particularly in contexts where components frequently re-render or are interactively dragged.

## The Problem

The error occurs due to an infinite render loop in Radix UI's Popper component, specifically in the `PopperAnchor` component. The issue is that this component contains a `useEffect` call without a dependency array:

```jsx
// From @radix-ui/react-popper/src/popper.tsx
React.useEffect(() => {
  context.onAnchorChange(virtualRef?.current || ref.current);
}); // Missing dependency array
```

This causes a new effect to run on every render, which updates state, which triggers another render, creating an infinite loop.

The error typically manifests in these scenarios:
1. When a component containing a dropdown or context menu is dragged or moved
2. When using multiple nested portals (like dropdown inside dialog)
3. When components re-render frequently due to state updates

## Solutions

### Solution 1: Use our Safe Components

We've created safer versions of the Radix UI dropdown menu and context menu that prevent these infinite loops:

```jsx
import { SafeDropdownMenu } from "~/components/ui/dropdown-menu-safe";
import { SafeContextMenu } from "~/components/ui/context-menu-safe";
```

These components:
- Use a stable portal implementation that reduces unnecessary re-renders
- Set `modal={false}` by default to prevent focus-related issues
- Pre-compose the content with the portal for easier use

### Solution 2: Set `modal={false}`

If you're using the standard Radix UI components, setting `modal={false}` helps in many cases:

```jsx
<DropdownMenu.Root modal={false}>
  {/* ... */}
</DropdownMenu.Root>
```

### Solution 3: Debounce or Throttle Position Updates

For elements that move frequently, consider debouncing position updates:

```jsx
import { useDebouncedCallback } from 'use-debounce';

function DraggableWithDropdown() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Debounce position updates to avoid excessive re-renders
  const debouncedSetPosition = useDebouncedCallback(
    (newPos) => setPosition(newPos),
    50 // 50ms debounce
  );
  
  return (
    <Draggable onDrag={(e, data) => debouncedSetPosition({ x: data.x, y: data.y })}>
      <div style={{ transform: `translate(${position.x}px, ${position.y}px)` }}>
        <DropdownMenu.Root modal={false}>
          {/* ... */}
        </DropdownMenu.Root>
      </div>
    </Draggable>
  );
}
```

### Solution 4: Use React ErrorBoundary

As a last resort, wrap components in an error boundary to prevent the app from crashing:

```jsx
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback() {
  return <div>Something went wrong with the dropdown menu</div>;
}

function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ComponentWithDropdowns />
    </ErrorBoundary>
  );
}
```

## Future Improvements

The ideal solution would be for Radix UI to fix the issue at its source by:
1. Adding proper dependency arrays to all useEffect calls
2. Ensuring proper cleanup in useEffect returns
3. Implementing proper ref management to prevent circular updates

Until that happens, the solutions above should help mitigate the issue.

## References

- [Radix UI issue #2717](https://github.com/radix-ui/primitives/issues/2717)
- [Radix UI issue #3385](https://github.com/radix-ui/primitives/issues/3385)
- [Fix PR #3386](https://github.com/radix-ui/primitives/pull/3386) 