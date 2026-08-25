export function safeNextPath(value: FormDataEntryValue | string | null | undefined) {
  if (
    typeof value !== "string"
    || !value.startsWith("/")
    || value.startsWith("//")
    || value.includes("\\")
    || /%5c/i.test(value)
  ) {
    return "/";
  }
  return value;
}
