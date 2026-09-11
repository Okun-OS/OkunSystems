/**
 * Zentrale Template Engine für alle serverseitig erzeugten Dokumente
 * (Rechnung, Abschlussprotokoll, Auftragsbestätigung, Mahnung …).
 *
 * Unterstützt:
 *   {{pfad.zum.wert}}          – Wertausgabe, HTML-escaped
 *   {{{pfad.zum.wert}}}        – Wertausgabe ohne Escaping (nur für geprüftes HTML)
 *   {{#each liste}} … {{/each}} – echte wiederholbare Struktur (z. B. Positionen)
 *   {{#if wert}} … {{else}} … {{/if}}
 *
 * Innerhalb von {{#each}} stehen `this`, `@index` und `@number` (1-basiert)
 * sowie alle Felder des Elements zur Verfügung. Der äußere Kontext bleibt
 * erreichbar.
 */

export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | TemplateValue[]
  | { [key: string]: TemplateValue };

export type TemplateContext = Record<string, TemplateValue>;

export type RenderOptions = {
  /** Unbekannte Platzhalter werden hierdurch ersetzt (Default: leerer String). */
  missingValue?: string;
  /** Sammelt nicht auflösbare Pfade für die Admin-Vorschau. */
  collectMissing?: string[];
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type Frame = { scope: TemplateValue; parent: Frame | null; locals: TemplateContext };

function lookup(frame: Frame, path: string): TemplateValue {
  if (path === "this" || path === ".") return frame.scope;

  const segments = path.split(".");
  const head = segments[0];

  // Locals (@index, @number …) gewinnen im innersten Frame.
  let current: Frame | null = frame;
  while (current) {
    if (head in current.locals) {
      return resolvePath(current.locals[head], segments.slice(1));
    }
    if (
      current.scope &&
      typeof current.scope === "object" &&
      !Array.isArray(current.scope) &&
      head in (current.scope as Record<string, TemplateValue>)
    ) {
      return resolvePath(
        (current.scope as Record<string, TemplateValue>)[head],
        segments.slice(1)
      );
    }
    current = current.parent;
  }
  return undefined;
}

function resolvePath(value: TemplateValue, segments: string[]): TemplateValue {
  let current = value;
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, TemplateValue>)[segment];
  }
  return current;
}

function isTruthy(value: TemplateValue): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (value === "" || value === 0) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function stringify(value: TemplateValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "ja" : "nein";
  if (typeof value === "object") return "";
  return String(value);
}

const TOKEN = /\{\{\{\s*([a-zA-Z0-9_@.]+)\s*\}\}\}|\{\{\s*(#each|#if|else|\/each|\/if)?\s*([a-zA-Z0-9_@.]*)\s*\}\}/g;

type Node =
  | { kind: "text"; value: string }
  | { kind: "value"; path: string; raw: boolean }
  | { kind: "each"; path: string; body: Node[] }
  | { kind: "if"; path: string; body: Node[]; alternate: Node[] };

/** Zerlegt das Template einmalig in einen Baum (kein eval, kein Function()). */
export function parseTemplate(template: string): Node[] {
  const root: Node[] = [];
  const stack: Array<{ nodes: Node[]; node?: Node; branch?: "body" | "alternate" }> = [
    { nodes: root },
  ];
  let cursor = 0;

  const push = (node: Node) => {
    const top = stack[stack.length - 1];
    top.nodes.push(node);
  };

  TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN.exec(template)) !== null) {
    if (match.index > cursor) {
      push({ kind: "text", value: template.slice(cursor, match.index) });
    }
    cursor = match.index + match[0].length;

    const rawPath = match[1];
    if (rawPath !== undefined) {
      push({ kind: "value", path: rawPath, raw: true });
      continue;
    }

    const helper = match[2];
    const path = match[3];

    if (helper === "#each") {
      const node: Node = { kind: "each", path, body: [] };
      push(node);
      stack.push({ nodes: node.body, node, branch: "body" });
    } else if (helper === "#if") {
      const node: Node = { kind: "if", path, body: [], alternate: [] };
      push(node);
      stack.push({ nodes: node.body, node, branch: "body" });
    } else if (helper === "else") {
      const top = stack[stack.length - 1];
      if (top.node?.kind === "if") {
        stack[stack.length - 1] = {
          nodes: top.node.alternate,
          node: top.node,
          branch: "alternate",
        };
      }
    } else if (helper === "/each" || helper === "/if") {
      if (stack.length > 1) stack.pop();
    } else if (path) {
      push({ kind: "value", path, raw: false });
    }
  }

  if (cursor < template.length) {
    push({ kind: "text", value: template.slice(cursor) });
  }
  return root;
}

function renderNodes(nodes: Node[], frame: Frame, options: RenderOptions): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "text") {
      out += node.value;
      continue;
    }
    if (node.kind === "value") {
      const value = lookup(frame, node.path);
      if (value === undefined && options.collectMissing) {
        if (!options.collectMissing.includes(node.path)) options.collectMissing.push(node.path);
      }
      const text = value === undefined ? (options.missingValue ?? "") : stringify(value);
      out += node.raw ? text : escapeHtml(text);
      continue;
    }
    if (node.kind === "each") {
      const list = lookup(frame, node.path);
      if (!Array.isArray(list)) {
        if (options.collectMissing && list === undefined) {
          if (!options.collectMissing.includes(node.path)) options.collectMissing.push(node.path);
        }
        continue;
      }
      list.forEach((item, index) => {
        out += renderNodes(node.body, {
          scope: item,
          parent: frame,
          locals: { "@index": index, "@number": index + 1, "@first": index === 0, "@last": index === list.length - 1 },
        }, options);
      });
      continue;
    }
    // if
    const value = lookup(frame, node.path);
    out += renderNodes(isTruthy(value) ? node.body : node.alternate, frame, options);
  }
  return out;
}

export function renderTemplate(
  template: string,
  context: TemplateContext,
  options: RenderOptions = {}
): string {
  const nodes = parseTemplate(template);
  return renderNodes(nodes, { scope: context, parent: null, locals: {} }, options);
}

/** Baut ein vollständiges HTML-Dokument aus Template-HTML und -CSS. */
export function buildDocumentHtml(input: {
  html: string;
  css: string;
  title: string;
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${escapeHtml(input.title)}</title>
<style>
${input.css}
</style>
</head>
<body>
${input.html}
</body>
</html>`;
}

/** Alle im Template referenzierten Platzhalter — für die Admin-Validierung. */
export function extractPlaceholders(template: string): string[] {
  const found = new Set<string>();
  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.kind === "value") found.add(node.path);
      else if (node.kind === "each") {
        found.add(node.path);
        walk(node.body);
      } else if (node.kind === "if") {
        found.add(node.path);
        walk(node.body);
        walk(node.alternate);
      }
    }
  };
  walk(parseTemplate(template));
  return [...found].filter((p) => p && !p.startsWith("@") && p !== "this");
}
