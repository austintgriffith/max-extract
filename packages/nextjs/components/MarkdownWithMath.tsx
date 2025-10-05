import "katex/dist/katex.min.css";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

interface MarkdownWithMathProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownWithMath: React.FC<MarkdownWithMathProps> = ({ content, className = "", style = {} }) => {
  return (
    <div className={className} style={style}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
