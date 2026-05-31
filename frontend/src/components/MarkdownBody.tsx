import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  children: string;
};

export function MarkdownBody({ children }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        a: ({ children: linkChildren, href }) => (
          <a className="text-red-200 underline decoration-lastfm/60 underline-offset-2 hover:text-white" href={href} rel="noreferrer" target="_blank">
            {linkChildren}
          </a>
        ),
        code: ({ children: codeChildren }) => <code className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] text-zinc-100">{codeChildren}</code>,
        p: ({ children: paragraphChildren }) => <p className="my-1 first:mt-0 last:mb-0">{paragraphChildren}</p>,
        ul: ({ children: listChildren }) => <ul className="my-2 list-disc space-y-1 pl-5">{listChildren}</ul>,
        ol: ({ children: listChildren }) => <ol className="my-2 list-decimal space-y-1 pl-5">{listChildren}</ol>,
        blockquote: ({ children: quoteChildren }) => <blockquote className="my-2 border-l-2 border-lastfm/70 pl-3 text-zinc-400">{quoteChildren}</blockquote>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
