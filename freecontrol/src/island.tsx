import type { Context } from "fuyu-plugin";
import { DOWNLOAD_URL } from "./protocol.ts";
import { FreeControlIcon, RefreshIcon, UsbIcon, WifiIcon } from "./icons.tsx";
import { localized, text } from "./text.ts";
import { useFreeControl } from "./useFreeControl.ts";
import "./styles.css";

export default function apply(ctx: Context) {
  function Page() {
    const model = useFreeControl(ctx);
    const { snapshot } = model;
    const needsPairing = snapshot.status === "unpaired" || snapshot.status === "unauthorized";
    const missing = snapshot.status === "unpaired" && !snapshot.installed;

    if (needsPairing) {
      return (
        <div className="fuyu-freecontrol fuyu-freecontrol--empty">
          <FreeControlIcon size={22} />
          <h3 className="fuyu-freecontrol__title">
            {snapshot.status === "unauthorized" ? text.expiredTitle : missing ? text.missingTitle : text.unpairedTitle}
          </h3>
          {missing ? (
            <ol className="fuyu-freecontrol__steps">
              {text.installSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          ) : (
            <>
              <p className="fuyu-freecontrol__note">
                {snapshot.status === "unauthorized" ? text.expiredBody : text.unpairedBody}
              </p>
              {snapshot.status === "unpaired" && (
                <p className="fuyu-freecontrol__note">{text.versionHint}</p>
              )}
            </>
          )}
          {missing && (
            <div className="fuyu-freecontrol__download">
              <span className="fuyu-freecontrol__field-label">{text.downloadLabel}</span>
              <code className="fuyu-freecontrol__download-url">{DOWNLOAD_URL}</code>
            </div>
          )}
          <div className="fuyu-freecontrol__actions">
            {missing && (
              <button type="button" className="fuyu-freecontrol__button" onClick={() => void model.copyDownloadLink()}>
                {model.copyState === "copied" ? text.copied : text.copyLink}
              </button>
            )}
            <button
              type="button"
              className={`fuyu-freecontrol__button ${missing ? "is-quiet" : ""}`}
              onClick={() => void model.refresh()}
            >
              {text.retry}
            </button>
          </div>
          {missing && model.copyState === "failed" && (
            <p className="fuyu-freecontrol__note is-error" role="alert">{text.copyFailed}</p>
          )}
        </div>
      );
    }

    if (snapshot.status === "connecting") {
      return (
        <div className="fuyu-freecontrol fuyu-freecontrol--empty">
          <FreeControlIcon size={22} />
          <p className="fuyu-freecontrol__note">{text.checking}</p>
          <button type="button" className="fuyu-freecontrol__button" onClick={() => void model.refresh()}>
            {text.retry}
          </button>
        </div>
      );
    }

    return (
      <div className="fuyu-freecontrol">
        <header className="fuyu-freecontrol__header">
          <div>
            <h3 className="fuyu-freecontrol__title">{text.title}</h3>
            <p className="fuyu-freecontrol__summary">
              {text.summary(snapshot.devices.length, snapshot.onlineCount, snapshot.connectedCount)}
            </p>
          </div>
          <button type="button" className="fuyu-freecontrol__icon-button" aria-label={text.refresh} onClick={() => void model.refresh()}>
            <RefreshIcon />
          </button>
        </header>

        {snapshot.status === "offline" && (
          <p className="fuyu-freecontrol__banner"><span className="fuyu-freecontrol__dot is-offline" />{text.status.offline}</p>
        )}
        {model.error && <p className="fuyu-freecontrol__banner is-error">{text.errors[model.error]}</p>}

        {snapshot.devices.length === 0 ? (
          <div className="fuyu-freecontrol__empty-list">
            <h4 className="fuyu-freecontrol__title">{text.emptyTitle}</h4>
            <p className="fuyu-freecontrol__note">{text.emptyBody}</p>
          </div>
        ) : (
          <ul className="fuyu-freecontrol__list">
            {snapshot.devices.map((device) => {
              const connected = device.status === "connected";
              const busy = model.busyDeviceId === device.id;
              const canConnect = connected || device.status === "idle" || (device.kind === "wifi" && device.status === "offline");
              return (
                <li key={device.id} className={`fuyu-freecontrol__device is-${device.status}`}>
                  <span className="fuyu-freecontrol__dot" aria-hidden="true" />
                  <span className="fuyu-freecontrol__device-info">
                    <span className="fuyu-freecontrol__device-name">
                      {device.alias}
                      <span className="fuyu-freecontrol__kind">{device.kind === "wifi" ? <WifiIcon /> : <UsbIcon />}{text.kind[device.kind]}</span>
                    </span>
                    <span className="fuyu-freecontrol__connection-id">{device.connectionId || "—"}</span>
                  </span>
                  <button
                    type="button"
                    className={`fuyu-freecontrol__action ${connected ? "is-disconnect" : "is-connect"}`}
                    disabled={!canConnect || busy}
                    onClick={() => void model.runAction(device.id, connected ? "disconnect" : "connect")}
                  >
                    {busy ? (model.busyAction === "connect" ? text.connecting : text.disconnecting) : connected ? text.disconnect : text.connect}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  function Collapsed() {
    const { snapshot } = useFreeControl(ctx);
    return (
      <span className="fuyu-freecontrol__collapsed">
        <FreeControlIcon size={15} />
        <span>{text.collapsed(snapshot.connectedCount, snapshot.devices.length)}</span>
      </span>
    );
  }

  ctx.slots.add("island.page/v1", {
    id: "freecontrol",
    title: localized.title,
    component: Page,
    icon: FreeControlIcon,
  });

  ctx.slots.add("island.collapsed/v1", {
    id: "freecontrol-status",
    opens: "freecontrol",
    label: localized.collapsedLabel,
    component: Collapsed,
  });
}
