export type ParsedUrl = {
  raw: string;
  scheme: string;
  path: string;
  query: Record<string, string>;
  isValid: boolean;
};

const SEP = "://";

/** Parses a URL into scheme, path (text between `://` and the first `?` or `#`), and query map.
 *  Repeated query keys collapse to the last value; fragments are dropped. */
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
  const hashStart = raw.indexOf("#");
  const delimiters = [queryStart, hashStart].filter((i) => i !== -1);
  const cut = delimiters.length ? Math.min(...delimiters) : raw.length;
  const beforeQueryOrHash = raw.slice(0, cut);
  const sepIndex = beforeQueryOrHash.indexOf(SEP);
  const path =
    sepIndex === -1
      ? beforeQueryOrHash.slice(scheme.length + 1)
      : beforeQueryOrHash.slice(sepIndex + SEP.length);

  const query: Record<string, string> = {};
  u.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  return { raw, scheme, path, query, isValid: true };
}
