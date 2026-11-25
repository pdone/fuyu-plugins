import type { Context } from "fuyu-plugin";
import { DOWNLOAD_URL } from "./protocol.ts";
import { text } from "./text.ts";
import { useFreeControl } from "./useFreeControl.ts";
import "./styles.css";

export default function apply(ctx: Context) {
  function Section() {
    const model = useFreeControl(ctx);
    const { snapshot } = model;
    const needsSetup = snapshot.status === "unpaired" || snapshot.status === "unauthorized";
    const missing = snapshot.status === "unpaired" && !snapshot.installed;

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
        {missing ? (
          <ol className="fuyu-freecontrol__steps">
            {text.installSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        ) : snapshot.status === "connecting" ? (
          <p className="fuyu-freecontrol__note">{text.checking}</p>
        ) : snapshot.status === "offline" ? (
          <p className="fuyu-freecontrol__note">{text.offlineBody}</p>
        ) : needsSetup ? (
          <>
            <p className="fuyu-freecontrol__note">
              {snapshot.status === "unauthorized" ? text.expiredBody : text.unpairedBody}
            </p>
            {snapshot.status === "unpaired" && (
              <p className="fuyu-freecontrol__note">{text.versionHint}</p>
            )}
          </>
        ) : (
          <p className="fuyu-freecontrol__note">{text.autoHint}</p>
        )}
        {missing && (
          <div className="fuyu-freecontrol__download">
            <span className="fuyu-freecontrol__field-label">{text.downloadLabel}</span>
            <code className="fuyu-freecontrol__download-url">{DOWNLOAD_URL}</code>
          </div>
        )}
        <div className="fuyu-freecontrol__settings-actions">
          {missing && (
            <button type="button" className="fuyu-freecontrol__button" onClick={() => void model.copyDownloadLink()}>
              {model.copyState === "copied" ? text.copied : text.copyLink}
            </button>
          )}
          <button type="button" className="fuyu-freecontrol__button" onClick={() => void model.refresh()}>
            {text.refresh}
          </button>
        </div>
        {missing && model.copyState === "failed" && (
          <p className="fuyu-freecontrol__note is-error" role="alert">{text.copyFailed}</p>
        )}
        {model.error && <p className="fuyu-freecontrol__banner is-error">{text.errors[model.error]}</p>}
      </section>
    );
  }

  ctx.slots.add("settings.section/v1", { id: "fuyu-freecontrol", category: "pluginsV3", component: Section });
}
