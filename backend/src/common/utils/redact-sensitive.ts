const REDACTION_PATTERNS = [
  /api_key=([^&\s]+)/gi,
  /api_key%3D([^%\s]+)/gi,
  /authorization:\s*bearer\s+\S+/gi,
  /bearer\s+[A-Za-z0-9._~+/=-]+/gi,
];

export function redactSensitive(value: string): string {
  return REDACTION_PATTERNS.reduce(
    (redacted, pattern) =>
      redacted.replace(pattern, (match) => `${match.split(/[=%\s]/)[0]}=HIDDEN`),
    value,
  );
}
