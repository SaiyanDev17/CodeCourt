import ReactMarkdown from 'react-markdown';

interface ProblemStatementProps {
  markdownContent: string;
}

export default function ProblemStatement({ markdownContent }: ProblemStatementProps) {
  return (
    <div className="prose prose-invert prose-lg max-w-none 
      prose-headings:text-slate-100 prose-headings:font-bold prose-headings:tracking-tight 
      prose-h1:text-cyan-300 prose-h2:text-cyan-200/90 prose-h3:text-slate-200
      prose-p:text-slate-300 prose-p:leading-relaxed 
      prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-cyan-300 
      prose-strong:text-slate-100 prose-strong:font-semibold
      prose-ul:text-slate-300 prose-li:marker:text-cyan-500/60
      prose-pre:bg-slate-900/80 prose-pre:border prose-pre:border-slate-800
      prose-blockquote:border-l-cyan-500/40 prose-blockquote:bg-cyan-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-slate-300"
    >
      <ReactMarkdown
        components={{
          // Custom styling for code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            return inline ? (
              <code className="bg-cyan-950/40 text-cyan-200 border border-cyan-500/20 px-1.5 py-0.5 rounded-md text-sm font-mono shadow-[0_0_8px_rgba(34,211,238,0.1)]" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}
