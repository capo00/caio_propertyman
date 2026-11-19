import { ACTION_META, EMAIL_ACTION_META, PAYMENT_REMINDER_LIST, actionIcon, actionLabelCode, emailLabelCode } from "./fields.jsx";

// Akce rezervace pro ActionGroup -- v řádku seznamu (`UiElements.Crud` `getItemActionList`) i v
// hlavičce detailu, obojí stejně (majitel 2026-11-19, docs/proposal-admin-emails.md § 3). Co je
// povolené a co výrazné, říká server (`actionList`, `nextAction`, `emailActionList`, `emailHighlight`).
//
// Vpředu jen to, co je teď na řadě, zleva:
//  1. výrazné e-maily: informace k příjezdu (`building` / `positive`), připomínka platby (`warning`);
//  2. další krok -- když je výrazná připomínka platby, „… přijata“ je jen ikona s tooltipem (`positive`).
// Zbytek v menu „⋮“:
//  3. ostatní akce stavu;
//  4. pod čarou ostatní dostupné e-maily (bez výrazných z bodu 1); žádný = ani čára.
// „Upravit“ (a v seznamu „Smazat“) přidává volající.
//
// Popisky jsou řetězce (`useLsi`): ActionGroup dá tooltip jen z řetězce a v úzkém řádku zúží
// tlačítko na ikonu.

const PAID_ACTION_LIST = ["markDepositPaid", "markBalancePaid"];

/**
 * @param item         rezervace z `reservation/list` / `get`
 * @param actionLsi    popisky akcí stavu (`admin.action`)
 * @param emailLsi     popisky e-mailů (`admin.emailAction`)
 * @param onTransition (action) => …, otevře modál změny stavu
 * @param onEmail      (email) => …, otevře modál e-mailu
 */
export function reservationActionList({ item, actionLsi, emailLsi, onTransition, onEmail }) {
  const emailLabel = (email) => emailLsi?.[emailLabelCode(email, item)];
  const highlightList = item.emailHighlight ?? [];
  const reminderShown = highlightList.some(({ email }) => PAYMENT_REMINDER_LIST.includes(email));

  const highlighted = highlightList.map(({ email, colorScheme }) => ({
    icon: EMAIL_ACTION_META[email]?.icon,
    children: emailLabel(email),
    tooltip: emailLabel(email),
    colorScheme,
    significance: "highlighted",
    collapsed: "never",
    onClick: () => onEmail(email),
  }));

  const stateActions = (item.actionList ?? []).map((action) => {
    const next = action === item.nextAction;
    const label = actionLsi?.[actionLabelCode(action, item)];
    const iconOnly = next && reminderShown && PAID_ACTION_LIST.includes(action);
    return {
      icon: actionIcon(action, item),
      children: iconOnly ? undefined : label,
      tooltip: label,
      // Jen ikona: přístupný název z popisku, jinak by čtečka ohlásila jen „tlačítko“.
      elementAttrs: iconOnly ? { "aria-label": label } : undefined,
      colorScheme: iconOnly ? "positive" : next ? ACTION_META[action]?.colorScheme : undefined,
      significance: next ? "highlighted" : undefined,
      // Další krok vpředu, ostatní v menu.
      collapsed: next ? "never" : "always",
      onClick: () => onTransition(action),
    };
  });

  // Výrazný e-mail je vidět jako tlačítko, v menu by byl podruhé (majitel 2026-11-19).
  const highlightedEmails = new Set(highlightList.map(({ email }) => email));
  const emailList = (item.emailActionList ?? []).filter((email) => !highlightedEmails.has(email));
  const emails = emailList.length
    ? [
        { divider: true, collapsed: "always" },
        ...emailList.map((email) => ({
          icon: EMAIL_ACTION_META[email]?.icon,
          children: emailLabel(email),
          collapsed: "always",
          onClick: () => onEmail(email),
        })),
      ]
    : [];

  return { highlighted, stateActions, emails };
}
