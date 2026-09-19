import type { ReactNode } from "react";
import Link from "next/link";
import type { ContentNode } from "@/lib/opinly";
import { opinlyImageUrl } from "@/lib/opinly";

// Renders Opinly's ProseMirror/Tiptap-style content tree to accessible React.
// Pure/server component — no client JS needed.

function slugifyHeading(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}

function nodeText(node: ContentNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(nodeText).join("");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMarks(text: string, marks: ContentNode["marks"], key: string): ReactNode {
  if (!marks || marks.length === 0) return text;
  return marks.reduce<ReactNode>((acc, mark, i) => {
    const k = `${key}-m${i}`;
    switch (mark.type) {
      case "bold":
      case "strong":
        return <strong key={k}>{acc}</strong>;
      case "italic":
      case "em":
        return <em key={k}>{acc}</em>;
      case "underline":
        return <u key={k}>{acc}</u>;
      case "strike":
      case "s":
        return <s key={k}>{acc}</s>;
      case "code":
        return <code key={k}>{acc}</code>;
      case "link": {
        const href = String(mark.attrs?.href ?? "#");
        const external = /^https?:\/\//i.test(href);
        return external ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-600 hover:underline">
            {acc}
          </a>
        ) : (
          <Link key={k} href={href} className="text-brand-600 hover:underline">
            {acc}
          </Link>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function renderChildren(nodes: ContentNode[] | null | undefined, keyPrefix: string): ReactNode[] {
  return (nodes ?? []).map((child, i) => <RenderNode key={`${keyPrefix}-${i}`} node={child} keyPrefix={`${keyPrefix}-${i}`} />);
}

function RenderNode({ node, keyPrefix }: { node: ContentNode; keyPrefix: string }): ReactNode {
  switch (node.type) {
    case "doc":
      return <>{renderChildren(node.content, keyPrefix)}</>;

    case "text":
      return <>{applyMarks(node.text ?? "", node.marks, keyPrefix)}</>;

    case "paragraph":
      return <p>{renderChildren(node.content, keyPrefix)}</p>;

    case "heading": {
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 1), 6);
      const id = slugifyHeading(nodeText(node));
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      return <Tag id={id}>{renderChildren(node.content, keyPrefix)}</Tag>;
    }

    case "bulletList":
      return <ul>{renderChildren(node.content, keyPrefix)}</ul>;
    case "orderedList":
      return <ol start={node.attrs?.start ?? undefined}>{renderChildren(node.content, keyPrefix)}</ol>;
    case "listItem":
      return <li>{renderChildren(node.content, keyPrefix)}</li>;

    case "blockquote":
      return <blockquote>{renderChildren(node.content, keyPrefix)}</blockquote>;

    case "codeBlock":
      return (
        <pre>
          <code>{nodeText(node)}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = opinlyImageUrl(String(node.attrs?.src ?? node.attrs?.fileKey ?? ""));
      if (!src) return null;
      const alt = String(node.attrs?.alt ?? node.attrs?.title ?? "");
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} loading="lazy" className="rounded-xl" />
          {node.attrs?.caption ? <figcaption>{String(node.attrs.caption)}</figcaption> : null}
        </figure>
      );
    }

    // Tables (if present)
    case "table":
      return (
        <div className="overflow-x-auto">
          <table>
            <tbody>{renderChildren(node.content, keyPrefix)}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr>{renderChildren(node.content, keyPrefix)}</tr>;
    case "tableHeader":
      return <th>{renderChildren(node.content, keyPrefix)}</th>;
    case "tableCell":
      return <td>{renderChildren(node.content, keyPrefix)}</td>;

    default:
      // Unknown node: render its children so content is never lost.
      return <>{renderChildren(node.content, keyPrefix)}</>;
  }
}

export function ContentRenderer({ content }: { content: ContentNode | null | undefined }) {
  if (!content) return null;
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-brand-600 prose-img:rounded-xl">
      <RenderNode node={content} keyPrefix="c" />
    </div>
  );
}
