import { useEffect } from "uu5g05";
import { useSession } from "caio-ui/src/caio-ui-auth/session.jsx";
import { hasProfile } from "caio-ui/src/caio-ui-auth/profile.js";
import { setAdminHint, clearAdminHint } from "../tools/admin-hint.js";

// Profily, které pouští do adminu. Stejný seznam bere `guard` v app.jsx, ať se nerozjedou.
export const ADMIN_PROFILES = ["authorities"];

/**
 * Drží značku pro web (tools/admin-hint.js) v souladu s tím, kdo je v adminu přihlášený.
 * Přihlášený s právem → značka je; přihlášený bez práva → značka pryč. Dokud session
 * nenaběhla (`pending`) nebo nikdo není přihlášený, se značkou se nic neděje.
 */
export function useAdminHintSync() {
  const { state, identity } = useSession();
  useEffect(() => {
    if (state !== "authenticated") return;
    if (hasProfile(identity, ADMIN_PROFILES)) setAdminHint();
    else clearAdminHint();
  }, [state, identity]);
}
