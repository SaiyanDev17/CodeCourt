import ReactMarkdown from 'react-markdown';

interface ProblemStatementProps {
  markdownContent: string;
}

export default function ProblemStatement({ markdownContent }: ProblemStatementProps) {
  return (
    <div className="prose prose-slate prose-lg max-w-none">
      <ReactMarkdown
        components={{
          // Custom styling for code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            return inline ? (
              <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
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
