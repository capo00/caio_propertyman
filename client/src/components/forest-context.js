import { Utils } from "uu5g05";
import Config from "../config/config.js";

// Whether a component stands on a forest block (hero, reservation, `Section variant="forest"`).
// Forest is dark in both modes, so `useBackground()` cannot tell it from the dark page any
// more: in dark mode every background is "dark", and the buttons would all turn white.
// Section provides `true`, a light card inside a forest block resets it to `false`.
const [ForestContext, useForest] = Utils.Context.create(false, Config.TAG + "ForestContext");

export const ForestProvider = ForestContext.Provider;
export { useForest };
