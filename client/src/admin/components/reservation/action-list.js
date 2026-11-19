import { ACTION_META, EMAIL_ACTION_META, PAYMENT_REMINDER_LIST, actionLabelCode, emailLabelCode } from "./fields.jsx";

// Akce rezervace pro ActionGroup -- v řádku seznamu (`UiElements.Crud` `getItemActionList`) i v
// hlavičce detailu, ať se obojí neliší (docs/proposal-admin-emails.md § 3). Co je povolené a co
// výrazné, říká server (`actionList`, `nextAction`, `emailActionList`, `emailHighlight`).
//
// Pořadí zleva:
//  1. výrazné e-maily: informace k příjezdu (`building` / `positive`), připomínka platby (`warning`);
//  2. další krok -- když je výrazná připomínka platby, „… přijata“ je jen ikona s tooltipem (`positive`);
//  3. ostatní akce stavu: v seznamu v menu „⋮“, v detailu vedle (do menu, až když se nevejdou);
//  4. e-maily: v seznamu v menu pod čarou, v detailu tlačítko „Poslat e-mail“ s nabídkou.
//
// Popisky jsou řetězce (`useLsi`): ActionGroup dá tooltip jen z řetězce a v úzkém řádku zúží
// tlačítko na ikonu.

const PAID_ACTION_LIST = ["markDepositPaid", "markBalancePaid"];

/**
 * @param item         rezervace z `reservation/list` / `get`
 * @param place        "list" | "detail"
 * @param actionLsi    popisky akcí stavu (`admin.action`)
 * @param emailLsi     popisky e-mailů (`admin.emailAction`)
 * @param sendEmailLabel  popisek tlačítka „Poslat e-mail“ (detail)
 * @param onTransition (action) => …, otevře modál změny stavu
 * @param onEmail      (email) => …, otevře modál e-mailu
 */
export function reservationActionList({ item, place, actionLsi, emailLsi, sendEmailLabel, onTransition, onEmail }) {
  const list = place === "list";
  const emailLabel = (email) => emailLsi?.[emailLabelCode(email, item)];
  const highlightList = item.emailHighlight ?? [];
  const reminderShown = highlightList.some(({ email }) => PAYMENT_REMINDER_LIST.includes(email));

  const highlighted = highlightList.map(({ email, colorScheme }) => ({
    icon: EMAIL_ACTION_META[email]?.icon,
    children: emailLabel(email),
    tooltip: emailLabel(email),
    colorScheme,
    significance: "highlighted",
    collapsed: list ? "never" : "auto",
    onClick: () => onEmail(email),
  }));

  const stateActions = (item.actionList ?? []).map((action) => {
    const next = action === item.nextAction;
    const label = actionLsi?.[actionLabelCode(action, item)];
    const iconOnly = next && reminderShown && PAID_ACTION_LIST.includes(action);
    return {
      icon: ACTION_META[action]?.icon,
      children: iconOnly ? undefined : label,
      tooltip: label,
      // Jen ikona: přístupný název z popisku, jinak by čtečka ohlásila jen „tlačítko“.
      elementAttrs: iconOnly ? { "aria-label": label } : undefined,
      colorScheme: iconOnly ? "positive" : next ? ACTION_META[action]?.colorScheme : undefined,
      significance: next ? "highlighted" : undefined,
      // Seznam: další krok v řádku, ostatní v menu. Detail: všechno vidět, menu až když se nevejde.
      collapsed: list ? (next ? "never" : "always") : "auto",
      onClick: () => onTransition(action),
    };
  });

  const emailList = item.emailActionList ?? [];
  const emailItems = emailList.map((email) => ({
    icon: EMAIL_ACTION_META[email]?.icon,
    children: emailLabel(email),
    onClick: () => onEmail(email),
  }));

  let emails = [];
  if (emailItems.length && list) {
    emails = [{ divider: true, collapsed: "always" }, ...emailItems.map((entry) => ({ ...entry, collapsed: "always" }))];
  } else if (emailItems.length) {
    emails = [{ icon: "uugds-email", children: sendEmailLabel, collapsed: "auto", itemList: emailItems }];
  }

  return { highlighted, stateActions, emails };
}
