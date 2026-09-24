import { AppShell } from "@/components/app-shell";
import { Chrome, Globe2, Laptop, MonitorDown, Smartphone, type LucideIcon } from "lucide-react";

const store = (key: string) => process.env[key] || "";
type Action = { label: string; href: string };

function Card({
  icon: Icon,
  title,
  text,
  actions,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  actions: Action[];
}) {
  return (
    <article className="panel p-6">
      <Icon className="size-6 text-blue-400" />
      <h2 className="mt-6 text-xl font-semibold">{title}</h2>
      <p className="muted mt-2 min-h-14 leading-7">{text}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {actions.map((action) =>
          action.href ? (
            <a className="btn btn-secondary" href={action.href} key={action.label}>{action.label}</a>
          ) : (
            <span className="btn btn-secondary opacity-50" aria-disabled="true" key={action.label}>{action.label}</span>
          ),
        )}
      </div>
    </article>
  );
}

export default function Platforms() {
  const chrome = store("NEXT_PUBLIC_CHROME_STORE_URL");
  const edge = store("NEXT_PUBLIC_EDGE_STORE_URL");
  const firefox = store("NEXT_PUBLIC_FIREFOX_STORE_URL");
  const play = store("NEXT_PUBLIC_GOOGLE_PLAY_URL");
  const apple = store("NEXT_PUBLIC_APP_STORE_URL");
  const windows = store("NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL");
  const mac = store("NEXT_PUBLIC_MAC_DOWNLOAD_URL");
  const linux = store("NEXT_PUBLIC_LINUX_DOWNLOAD_URL");

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
        <div className="max-w-3xl">
          <p className="muted text-sm">One operations platform, every surface</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Install Vortix where your team works.</h1>
          <p className="muted mt-5 text-lg leading-8">Use the web/PWA directly, install the operations extension, or build signed mobile and desktop releases from the included source packages.</p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Card icon={Globe2} title="Web + PWA" text="The web deployment doubles as an installable progressive web app." actions={[{ label: "Open dashboard", href: "/dashboard" }, { label: "Install from browser", href: "/docs#pwa" }]} />
          <Card icon={Chrome} title="Browser extension" text="Quick health, metrics, checkout initialization and dashboard launch for Chromium and Firefox." actions={[{ label: "Chrome Web Store", href: chrome }, { label: "Edge Add-ons", href: edge }, { label: "Firefox Add-ons", href: firefox }, { label: "Chromium ZIP", href: "/downloads/vortix-extension-chromium.zip" }, { label: "Firefox ZIP", href: "/downloads/vortix-extension-firefox.zip" }]} />
          <Card icon={Smartphone} title="Mobile" text="Expo/React Native operations companion for Android and iOS, with secure authentication and release profiles." actions={[{ label: "Google Play", href: play }, { label: "App Store", href: apple }, { label: "Mobile source", href: "/downloads/vortix-mobile-source.zip" }]} />
          <Card icon={Laptop} title="Desktop" text="Tauri 2 desktop shell for Windows, macOS and Linux, plus the PWA fallback." actions={[{ label: "Windows", href: windows }, { label: "macOS", href: mac }, { label: "Linux", href: linux }, { label: "Desktop source", href: "/downloads/vortix-desktop-source.zip" }]} />
        </div>
        <section className="panel mt-8 p-6">
          <div className="flex gap-3">
            <MonitorDown className="mt-1 size-5 text-blue-400" />
            <div>
              <h2 className="font-semibold">Store buttons activate after publisher approval</h2>
              <p className="muted mt-2 leading-7">Set the corresponding <code>NEXT_PUBLIC_*_URL</code> environment variables after Chrome Web Store, Edge, Firefox, Google Play, Apple or desktop release URLs exist.</p>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
