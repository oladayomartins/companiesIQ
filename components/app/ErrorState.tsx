import { Icon, type IconName } from "@/components/ds";

/**
 * The one error state. An error is a dead end unless it offers a way on, so
 * `actions` is required — every caller passes at least a retry.
 *
 * Copy rule: nothing derived from the exception goes in `body`. Messages can
 * carry env var names, internal hosts and file paths; those belong in the
 * server log. `ref` is the only machine detail a visitor should ever see.
 */
export function ErrorState({
  title,
  body,
  actions,
  links,
  ref,
  icon = "alert",
  inline = false,
}: {
  title: string;
  body: React.ReactNode;
  actions: React.ReactNode;
  links?: React.ReactNode;
  ref?: string;
  icon?: IconName;
  inline?: boolean;
}) {
  return (
    <div className={"app-error-state" + (inline ? " app-error-state--inline" : "")}>
      <div className="app-error-state__icon">
        <Icon name={icon} size={26} />
      </div>
      <h1 className="app-error-state__title">{title}</h1>
      <p className="app-error-state__sub">{body}</p>
      <div className="app-error-state__actions">{actions}</div>
      {links ? <div className="app-error-state__links">{links}</div> : null}
      {ref ? <p className="app-error-state__ref mono">Ref: {ref}</p> : null}
    </div>
  );
}
