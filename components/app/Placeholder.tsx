import { Icon, Button, type IconName } from "@/components/ds";

export function Placeholder({ title, sub, icon }: { title: string; sub: string; icon: IconName }) {
  return (
    <div className="screen">
      <div className="placeholder">
        <span className="placeholder__icon">
          <Icon name={icon} size={28} />
        </span>
        <h2 className="placeholder__title">{title}</h2>
        <p className="placeholder__sub">{sub}</p>
        <Button variant="secondary">Set it up</Button>
      </div>
    </div>
  );
}
