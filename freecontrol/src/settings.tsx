import type { Context } from "fuyu-plugin";
import { text } from "./text.ts";
import { useFreeControl } from "./useFreeControl.ts";
import "./styles.css";

export default function apply(ctx: Context) {
  function Section() {
    const model = useFreeControl(ctx);
    const { snapshot } = model;

    return (
      <section className="fuyu-freecontrol fuyu-freecontrol__settings">
        <h3 className="fuyu-freecontrol__title">{text.settingsTitle}</h3>
        <p className="fuyu-freecontrol__settings-status">
          <span className={`fuyu-freecontrol__dot is-${snapshot.status}`} aria-hidden="true" />
          {text.status[snapshot.status]}
        </p>
        {snapshot.lastCheckedAt && snapshot.status === "ready" && (
          <p className="fuyu-freecontrol__note">
            {text.lastChecked(new Date(snapshot.lastCheckedAt).toLocaleTimeString())}
          </p>
        )}
        <p className="fuyu-freecontrol__note">{text.autoHint}</p>
        <button type="button" className="fuyu-freecontrol__button" onClick={() => void model.refresh()}>
          {text.refresh}
        </button>
        {model.error && <p className="fuyu-freecontrol__banner is-error">{text.errors[model.error]}</p>}
      </section>
    );
  }

  ctx.slots.add("settings.section/v1", { id: "fuyu-freecontrol", category: "pluginsV3", component: Section });
}
