"use client";

import { useState } from "react";
import {
  DoorClosed,
  Droplets,
  House,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Settings,
  SunMedium,
  Thermometer,
  Zap,
} from "lucide-react";
import type { ThemeLook } from "@/lib/ha-theme";
import { contrastLevel } from "@/lib/contrast";
import { isAllowedPreviewUrl } from "@/lib/wallpaper-url";

interface DashboardPreviewProps {
  look: ThemeLook;
  wallpaperUrl: string | null;
  styleName: string;
  contrastRatio: number | null;
  contrastSource: string;
  onWallpaperError: () => void;
}

const NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Lights", icon: Lightbulb, active: false },
  { label: "Climate", icon: Thermometer, active: false },
  { label: "Energy", icon: Zap, active: false },
  { label: "Security", icon: DoorClosed, active: false },
];

export function DashboardPreview({
  look,
  wallpaperUrl,
  styleName,
  contrastRatio,
  contrastSource,
  onWallpaperError,
}: DashboardPreviewProps) {
  const [lights, setLights] = useState({ Kitchen: true, Porch: false, Living: true });
  const [failed, setFailed] = useState(false);
  const level = contrastRatio == null ? null : contrastLevel(contrastRatio);
  const showWallpaper = Boolean(wallpaperUrl) && !failed && isAllowedPreviewUrl(wallpaperUrl ?? "");

  return (
    <div className="@container">
      <div
        id="preview"
        data-testid="dashboard-preview"
        className="relative h-[680px] overflow-hidden border border-black/10 shadow-[0_24px_60px_rgba(23,38,42,0.18)]"
        style={{
          borderRadius: 22,
          background: look.background,
          fontFamily: look.fontFamily,
          color: look.text,
        }}
      >
        {showWallpaper ? (
          // User wallpapers and pinned GitHub files are not known at build time.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wallpaperUrl ?? ""}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              setFailed(true);
              onWallpaperError();
            }}
          />
        ) : null}

        <div className="relative flex h-full">
          <aside
            className="flex w-[4.25rem] shrink-0 flex-col gap-1 px-2 py-3 @[640px]:w-44"
            style={{
              background: look.sidebar,
              color: look.text,
              borderRight: look.terminal ? `1px solid ${look.accent}` : undefined,
            }}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <House className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="hidden text-sm font-semibold @[640px]:inline">Home</span>
            </div>
            {NAV.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm"
                  style={{
                    background: item.active ? "color-mix(in srgb, currentColor 10%, transparent)" : "transparent",
                    color: item.active ? look.text : look.textSecondary,
                    boxShadow: item.active ? `inset 2px 0 0 ${look.accent}` : undefined,
                    borderRadius: look.terminal ? 0 : 8,
                  }}
                >
                  <Icon className="size-4 shrink-0" style={{ color: item.active ? look.accent : undefined }} />
                  <span className="hidden @[640px]:inline">{item.label}</span>
                </div>
              );
            })}
            <div
              className="mt-auto flex items-center gap-2 px-2 py-2 text-sm"
              style={{ color: look.textSecondary }}
            >
              <Settings className="size-4" />
              <span className="hidden @[640px]:inline">Settings</span>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header
              className="flex items-center gap-3 px-3"
              style={{
                background: look.headerBackground,
                borderBottom: look.headerBorder,
                minHeight: look.headerHeight,
                color: look.text,
                backdropFilter: look.waybar ? undefined : look.blur,
                WebkitBackdropFilter: look.waybar ? undefined : look.blur,
              }}
            >
              <Menu className="size-4 shrink-0 opacity-80" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold @[640px]:text-base">
                  {look.terminal ? "overview" : "Home"}
                </div>
              </div>
              {!look.waybar ? (
                <div className="ml-2 hidden items-center gap-3 text-xs @[520px]:flex" style={{ color: look.textSecondary }}>
                  <span style={{ color: look.text, boxShadow: `inset 0 -2px 0 ${look.accent}` }} className="pb-1">
                    Overview
                  </span>
                  <span>Climate</span>
                  <span>Lights</span>
                </div>
              ) : (
                <div className="ml-3 hidden text-[11px] tracking-wide @[520px]:block" style={{ color: look.textSecondary }}>
                  bar
                </div>
              )}
              <div className="ml-auto flex items-center gap-3 text-xs" style={{ color: look.textSecondary }}>
                <span>32°</span>
                <span>18:42</span>
              </div>
            </header>

            <div className="dash-grid min-h-0 flex-1 content-start overflow-auto p-3" style={{ gap: look.gap, ["--dash-gap" as string]: look.gap }}>
              <Card look={look} className="dash-span-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs" style={{ color: look.textSecondary }}>
                      Weather · demo
                    </div>
                    <div className="mt-1 text-lg font-semibold">Darwin</div>
                    <div className="text-3xl font-semibold tracking-tight">32°</div>
                    <div className="text-sm" style={{ color: look.textSecondary }}>
                      Humid · feels like 36°
                    </div>
                  </div>
                  <SunMedium className="size-10" style={{ color: look.warning }} />
                </div>
              </Card>

              <Sensor look={look} icon={<Thermometer className="size-4" />} label="Living room" value="26.4°" tone={look.info} />
              <Sensor look={look} icon={<Droplets className="size-4" />} label="Humidity" value="78%" tone={look.accent} />
              <Sensor look={look} icon={<Zap className="size-4" />} label="Power" value="640 W" tone={look.warning} />
              <Sensor look={look} icon={<DoorClosed className="size-4" />} label="Front door" value="Closed" tone={look.success} />

              <Card look={look} className="dash-span-2 p-4">
                <div className="text-sm font-medium">Lights</div>
                <div className="mt-3 space-y-3">
                  {(Object.keys(lights) as (keyof typeof lights)[]).map((name) => (
                    <div key={name} className="flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2">
                        <Lightbulb className="size-4" style={{ color: lights[name] ? look.accent : look.textSecondary }} />
                        {name}
                      </span>
                      <button
                        type="button"
                        aria-pressed={lights[name]}
                        aria-label={`${name} light`}
                        onClick={() => setLights((current) => ({ ...current, [name]: !current[name] }))}
                        className="relative h-5 w-9 shrink-0"
                        style={{
                          borderRadius: look.terminal ? 2 : 999,
                          background: lights[name] ? look.accent : "color-mix(in srgb, currentColor 25%, transparent)",
                        }}
                      >
                        <span
                          className="absolute top-0.5 size-4"
                          style={{
                            borderRadius: look.terminal ? 1 : 999,
                            background: lights[name] ? look.onAccent : look.text,
                            left: lights[name] ? 18 : 2,
                          }}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card look={look} className="dash-span-2 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Split system</div>
                    <div className="text-xs" style={{ color: look.textSecondary }}>
                      Cooling · living room
                    </div>
                  </div>
                  <div className="text-2xl font-semibold">24°</div>
                </div>
                <div className="mt-4 h-2 overflow-hidden" style={{ borderRadius: look.terminal ? 0 : 999, background: "color-mix(in srgb, currentColor 16%, transparent)" }}>
                  <div className="h-full w-2/3" style={{ background: look.accent }} />
                </div>
              </Card>

              <Card look={look} className="dash-span-all p-3">
                <div className="grid grid-cols-3 gap-2">
                  {["Goodnight", "Away", "Movie"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="px-2 py-2 text-sm font-medium"
                      style={{
                        borderRadius: look.terminal ? 0 : `calc(${look.radius} * 0.6)`,
                        background: look.accent,
                        color: look.onAccent,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>

        {level && level !== "good" ? (
          <div
            className="absolute right-3 bottom-3 max-w-xs rounded-md px-3 py-2 text-xs shadow-lg"
            style={{ background: "#17262a", color: "#fbf6ee" }}
          >
            {level === "poor" ? "Text may be hard to read on this wallpaper." : "Small labels are a bit faint on this wallpaper."}{" "}
            {contrastSource}
          </div>
        ) : null}
        {!showWallpaper ? (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            Wallpaper did not load. The solid palette background is showing.
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-[#4d5e62]">
        Demo dashboard for {styleName}. Nothing here talks to a hub. Figures are sample data.
      </p>
    </div>
  );
}

function Card({
  look,
  className,
  children,
}: {
  look: ThemeLook;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={className}
      style={{
        background: look.cardBackground,
        border: `${look.borderWidth} solid ${look.borderColor}`,
        boxShadow: look.shadow,
        borderRadius: look.radius,
        backdropFilter: look.blur,
        WebkitBackdropFilter: look.blur,
        color: look.text,
      }}
    >
      {children}
    </div>
  );
}

function Sensor({
  look,
  icon,
  label,
  value,
  tone,
}: {
  look: ThemeLook;
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card look={look} className="p-3">
      <div className="flex items-center gap-2 text-xs" style={{ color: tone }}>
        {icon}
        <span style={{ color: look.textSecondary }}>{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </Card>
  );
}
