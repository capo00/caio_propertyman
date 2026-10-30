import { useAppBackground } from "uu5g05";

/**
 * Whether the page shows the dark mode now. The mode itself (switch in the top bar, or the
 * system without a choice) is the stack's: caio-ui sets the app background through uu5g05
 * `AppBackgroundProvider`, so this re-renders when the mode changes -- no state of our own.
 *
 * Only for what CSS variables cannot do (a filter on a photo, the uu5 background context).
 * Colours themselves are `theme.color.<role>` and switch without React.
 */
export function useDarkMode() {
  const { background } = useAppBackground();
  return background === "dark";
}

export default useDarkMode;
