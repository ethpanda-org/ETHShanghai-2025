import React, { useEffect, useState } from "react";
import type { NextPage } from "next";
import { MetaHeader } from "~~/components/MetaHeader";

const ApiDocs: NextPage = () => {
  const [apiDocs, setApiDocs] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiDocs = async () => {
      try {
        setLoading(true);
        const response = await fetch("https://right-proof-api.deno.dev/");
        console.log(response);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setApiDocs(data.result || "");
        setError(null);
      } catch (err) {
        console.error("Error fetching API docs:", err);
        setError("Failed to load API documentation. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchApiDocs();
  }, []);

  // Helper function to parse inline markdown (code, bold)
  const parseInlineMarkdown = (text: string, keyPrefix: string) => {
    const parts = [];
    let current = "";
    let isBold = false;
    let isCode = false;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === "*" && text[i + 1] === "*") {
        if (current) parts.push(isBold ? <strong key={`${keyPrefix}-b-${i}`}>{current}</strong> : current);
        current = "";
        isBold = !isBold;
        i++;
      } else if (text[i] === "`") {
        if (current)
          parts.push(
            isCode ? (
              <code key={`${keyPrefix}-c-${i}`} className="bg-base-200 px-2 py-1 rounded">
                {current}
              </code>
            ) : (
              current
            ),
          );
        current = "";
        isCode = !isCode;
      } else {
        current += text[i];
      }
    }
    if (current) {
      if (isBold) parts.push(<strong key={`${keyPrefix}-b-end`}>{current}</strong>);
      else if (isCode)
        parts.push(
          <code key={`${keyPrefix}-c-end`} className="bg-base-200 px-2 py-1 rounded">
            {current}
          </code>,
        );
      else parts.push(current);
    }
    return parts;
  };

  // Simple markdown-to-JSX renderer for basic markdown
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return null;

    const lines = markdown.split("\n");
    const elements: JSX.Element[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let codeLanguage = "";

    lines.forEach((line, index) => {
      // Code block detection
      if (line.trim().startsWith("```")) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().substring(3);
          codeContent = [];
        } else {
          inCodeBlock = false;
          elements.push(
            <pre key={`code-${index}`} className="bg-base-200 p-4 rounded-lg overflow-x-auto my-4">
              <code className={`language-${codeLanguage}`}>{codeContent.join("\n")}</code>
            </pre>,
          );
          codeContent = [];
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Headers
      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={index} className="text-4xl font-bold my-4">
            {parseInlineMarkdown(line.substring(2), `h1-${index}`)}
          </h1>,
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={index} className="text-3xl font-bold mt-8 mb-4">
            {parseInlineMarkdown(line.substring(3), `h2-${index}`)}
          </h2>,
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={index} className="text-2xl font-semibold mt-6 mb-3">
            {parseInlineMarkdown(line.substring(4), `h3-${index}`)}
          </h3>,
        );
      }
      // Bold text with inline code
      else if (line.includes("**") || line.includes("`")) {
        elements.push(
          <p key={index} className="my-2">
            {parseInlineMarkdown(line, `p-${index}`)}
          </p>,
        );
      }
      // List items
      else if (line.trim().startsWith("- ")) {
        const content = line.trim().substring(2);
        elements.push(
          <li key={index} className="ml-6 my-1 list-disc">
            {parseInlineMarkdown(content, `li-${index}`)}
          </li>,
        );
      }
      // Empty lines
      else if (line.trim() === "") {
        elements.push(<div key={index} className="h-2" />);
      }
      // Regular paragraphs
      else {
        elements.push(
          <p key={index} className="my-2">
            {line}
          </p>,
        );
      }
    });

    return elements;
  };

  return (
    <>
      <MetaHeader
        title="API Documentation | AI DimSum RightProof"
        description="API documentation for the AI DimSum RightProof copyright and license management system"
      >
        {/* We are importing the font this way to lighten the size of SE2. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree&display=swap" rel="stylesheet" />
      </MetaHeader>
      <div className="flex items-center flex-col flex-grow pt-10" data-theme="exampleUi">
        <div className="px-5 w-full max-w-5xl">
          {loading && (
            <div className="flex justify-center items-center h-64">
              <span className="loading loading-spinner loading-lg"></span>
            </div>
          )}

          {error && (
            <div className="alert alert-error shadow-lg">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current flex-shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && <div className="prose prose-lg max-w-none">{renderMarkdown(apiDocs)}</div>}
        </div>
      </div>
    </>
  );
};

export default ApiDocs;
