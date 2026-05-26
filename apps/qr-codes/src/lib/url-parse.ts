export type ParsedUrl = {
  raw: string;
  scheme: string;
  path: string;
  query: Record<string, string>;
  isValid: boolean;
};

const SEP = "://";

export function parseUrl(input: string): ParsedUrl {
  const raw = input.trim();
  const empty: ParsedUrl = { raw, scheme: "", path: "", query: {}, isValid: false };
  if (!raw) return empty;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return empty;
  }

  const scheme = u.protocol.replace(/:$/, "");
  if (!scheme) return empty;

  const queryStart = raw.indexOf("?");
  const beforeQuery = queryStart === -1 ? raw : raw.slice(0, queryStart);
  const sepIndex = beforeQuery.indexOf(SEP);
  const path =
    sepIndex === -1
      ? beforeQuery.slice(scheme.length + 1)
      : beforeQuery.slice(sepIndex + SEP.length);

  const query: Record<string, string> = {};
  u.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return { raw, scheme, path, query, isValid: true };
}
