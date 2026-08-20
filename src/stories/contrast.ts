export interface RgbaColor {
  red: number;
  green: number;
  blue: number;
  alpha: number;
}

const TRANSPARENT: RgbaColor = {
  red: 0,
  green: 0,
  blue: 0,
  alpha: 0,
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseChannel(value: string, scale: number) {
  const parsed = Number.parseFloat(value);
  return value.endsWith("%") ? (parsed / 100) * scale : parsed;
}

function parseAlpha(value: string | undefined) {
  if (!value) return 1;
  return clamp(parseChannel(value, 1));
}

function splitFunctionalColor(value: string) {
  const [channels, alpha] = value.split("/").map((part) => part.trim());
  return {
    channels: channels!.split(/[\s,]+/u).filter(Boolean),
    alpha,
  };
}

function parseHexColor(value: string): RgbaColor | null {
  const hex = value.slice(1);
  if (![3, 4, 6, 8].includes(hex.length)) return null;
  const expanded =
    hex.length <= 4
      ? [...hex].map((character) => `${character}${character}`).join("")
      : hex;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha =
    expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { red, green, blue, alpha };
}

function parseRgbColor(value: string): RgbaColor | null {
  const match = value.match(/^rgba?\((.*)\)$/u);
  if (!match) return null;
  const { channels, alpha } = splitFunctionalColor(match[1]!);
  if (channels.length === 4 && !alpha) {
    return {
      red: parseChannel(channels[0]!, 255),
      green: parseChannel(channels[1]!, 255),
      blue: parseChannel(channels[2]!, 255),
      alpha: parseAlpha(channels[3]),
    };
  }
  if (channels.length !== 3) return null;
  return {
    red: parseChannel(channels[0]!, 255),
    green: parseChannel(channels[1]!, 255),
    blue: parseChannel(channels[2]!, 255),
    alpha: parseAlpha(alpha),
  };
}

function parseSrgbColor(value: string): RgbaColor | null {
  const match = value.match(/^color\(srgb\s+(.+)\)$/u);
  if (!match) return null;
  const { channels, alpha } = splitFunctionalColor(match[1]!);
  if (channels.length !== 3) return null;
  return {
    red: clamp(parseChannel(channels[0]!, 1)) * 255,
    green: clamp(parseChannel(channels[1]!, 1)) * 255,
    blue: clamp(parseChannel(channels[2]!, 1)) * 255,
    alpha: parseAlpha(alpha),
  };
}

function linearToSrgb(value: number) {
  const clamped = clamp(value);
  return clamped <= 0.0031308
    ? clamped * 12.92
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function parseOklchColor(value: string): RgbaColor | null {
  const match = value.match(/^oklch\((.+)\)$/u);
  if (!match) return null;
  const { channels, alpha } = splitFunctionalColor(match[1]!);
  if (channels.length !== 3) return null;
  const lightness = parseChannel(channels[0]!, 1);
  const chroma = Number.parseFloat(channels[1]!);
  const hue = (Number.parseFloat(channels[2]!) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return {
    red:
      linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s) *
      255,
    green:
      linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s) *
      255,
    blue:
      linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s) *
      255,
    alpha: parseAlpha(alpha),
  };
}

export function parseCssColor(value: string): RgbaColor {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent") return { ...TRANSPARENT };
  const parsed = normalized.startsWith("#")
    ? parseHexColor(normalized)
    : (parseRgbColor(normalized) ??
      parseSrgbColor(normalized) ??
      parseOklchColor(normalized));
  if (
    !parsed ||
    Object.values(parsed).some((channel) => Number.isNaN(channel))
  ) {
    throw new Error(`Unsupported computed CSS color: ${value}`);
  }
  return {
    red: clamp(parsed.red, 0, 255),
    green: clamp(parsed.green, 0, 255),
    blue: clamp(parsed.blue, 0, 255),
    alpha: clamp(parsed.alpha),
  };
}

export function compositeColor(
  foreground: RgbaColor,
  background: RgbaColor,
): RgbaColor {
  const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
  if (alpha === 0) return { ...TRANSPARENT };
  const channel = (foregroundValue: number, backgroundValue: number) =>
    (foregroundValue * foreground.alpha +
      backgroundValue * background.alpha * (1 - foreground.alpha)) /
    alpha;
  return {
    red: channel(foreground.red, background.red),
    green: channel(foreground.green, background.green),
    blue: channel(foreground.blue, background.blue),
    alpha,
  };
}

function relativeLuminance(color: RgbaColor) {
  const linear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linear(color.red) +
    0.7152 * linear(color.green) +
    0.0722 * linear(color.blue)
  );
}

export function colorContrastRatio(
  foreground: RgbaColor,
  background: RgbaColor,
) {
  const opaqueBackground =
    background.alpha < 1
      ? compositeColor(background, {
          red: 255,
          green: 255,
          blue: 255,
          alpha: 1,
        })
      : background;
  const opaqueForeground = compositeColor(foreground, opaqueBackground);
  const foregroundLuminance = relativeLuminance(opaqueForeground);
  const backgroundLuminance = relativeLuminance(opaqueBackground);
  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}

export function effectiveBackgroundColor(element: HTMLElement) {
  let background = { ...TRANSPARENT };
  let current: HTMLElement | null = element;
  while (current) {
    const layer = parseCssColor(getComputedStyle(current).backgroundColor);
    background = compositeColor(background, layer);
    if (background.alpha >= 0.999) break;
    current = current.parentElement;
  }
  return background;
}

export function computedContrastRatio(
  element: HTMLElement,
  colorProperty: "color" | "borderTopColor" = "color",
) {
  const foreground = parseCssColor(getComputedStyle(element)[colorProperty]);
  return colorContrastRatio(foreground, effectiveBackgroundColor(element));
}

export function customPropertyContrastRatio(
  element: HTMLElement,
  propertyName: `--${string}`,
) {
  const probe = element.ownerDocument.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = [
    "position:absolute",
    "width:0",
    "height:0",
    "overflow:hidden",
    `color:var(${propertyName})`,
  ].join(";");
  element.append(probe);
  try {
    return computedContrastRatio(probe);
  } finally {
    probe.remove();
  }
}
