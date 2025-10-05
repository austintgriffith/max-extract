"use client";

import { useEffect, useState } from "react";
import "katex/dist/katex.min.css";

interface MarkdownWithMathProps {
  content: string;
  className?: string;
  style?: React.CSSProperties;
}

export const MarkdownWithMath: React.FC<MarkdownWithMathProps> = ({ content, className = "", style = {} }) => {
  const [ReactMarkdown, setReactMarkdown] = useState<any>(null);
  const [remarkMath, setRemarkMath] = useState<any>(null);
  const [rehypeKatex, setRehypeKatex] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically import the markdown components only on client side
    const loadComponents = async () => {
      try {
        const [markdownModule, mathModule, katexModule] = await Promise.all([
          import("react-markdown"),
          import("remark-math"),
          import("rehype-katex"),
        ]);

        setReactMarkdown(() => markdownModule.default);
        setRemarkMath(() => mathModule.default);
        setRehypeKatex(() => katexModule.default);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to load markdown components:", error);
        setIsLoading(false);
      }
    };

    loadComponents();
  }, []);

  // Show loading state or fallback while components are loading
  if (isLoading || !ReactMarkdown || !remarkMath || !rehypeKatex) {
    return (
      <div className={className} style={style}>
        <div
          style={{
            fontFamily: '"Times New Roman", "STIX Two Text", "Georgia", serif',
            textAlign: "center",
            padding: "1rem",
            fontSize: "1.1rem",
            fontWeight: "600",
          }}
        >
          {content.replace(/\$\$/g, "")}
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
