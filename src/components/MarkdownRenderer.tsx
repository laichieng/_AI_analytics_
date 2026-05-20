import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="w-full text-slate-800 leading-relaxed font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-200 flex items-center gap-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold text-slate-800 mt-7 mb-3.5 flex items-center gap-1.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold text-indigo-700 mt-6 mb-3 flex items-center gap-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-2 text-sm text-slate-600">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-2 text-sm text-slate-600">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-slate-600 leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-indigo-500 bg-indigo-50/60 p-4 rounded-r-lg text-sm text-slate-700 my-4 italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="w-full overflow-x-auto my-6 border border-slate-200 rounded-xl shadow-sm bg-white">
              <table className="w-full text-sm border-collapse text-left">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100">
              {children}
            </tbody>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 font-medium text-slate-700 select-none">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3.5 text-slate-600 font-normal">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/70 transition-colors">
              {children}
            </tr>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 bg-slate-100 px-1 py-0.5 rounded text-xs mx-0.5">
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code className="bg-slate-100 text-pink-600 font-mono text-xs px-1.5 py-0.5 rounded border border-slate-200">
              {children}
            </code>
          ),
          hr: () => (
            <hr className="my-8 border-t border-slate-200 border-dashed" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
export default MarkdownRenderer;
