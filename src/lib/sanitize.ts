import DOMPurify from "isomorphic-dompurify";

/** Strip all HTML — use for plain-text storage (usernames, messages, etc.) */
export function sanitizeText(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/**
 * Sanitize trusted-ish HTML for rendering (blog content, email previews).
 * Allows structural/content tags but strips script, style, iframes, and all
 * event handlers and javascript: / data: URIs.
 */
export function sanitizeHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS: [
      "h1","h2","h3","h4","h5","h6",
      "p","br","hr","blockquote",
      "ul","ol","li",
      "strong","em","b","i","u","s",
      "a","img",
      "table","thead","tbody","tr","th","td",
      "pre","code",
      "div","span",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel", "id"],
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: true,
    // Strip javascript: and data: URIs from href/src
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  }).trim();
}
