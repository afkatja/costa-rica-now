export function getAppURL(path: string = "") {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (typeof window !== "undefined" ? window.location.origin : "")
  return base.replace(/\/$/, "") + path
}
