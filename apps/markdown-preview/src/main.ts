import { marked } from "marked";
import "./style.css";

const inputEl = document.querySelector<HTMLTextAreaElement>("#input");
const outputEl = document.querySelector<HTMLElement>("#output");

if (!inputEl || !outputEl) {
  throw new Error("Missing #input or #output element");
}

const SAMPLE = `# Hello 👋

This preview is built with **Vite**, **TypeScript** and the **marked**
dependency.

- Edit this text
- Watch it render live

\`\`\`js
console.log("code blocks work too");
\`\`\`
`;

// NOTE: assigning parsed Markdown straight to innerHTML is fine for a demo
// where the input is the user's own text. For untrusted input, sanitize the
// HTML first (e.g. with DOMPurify).
const render = (): void => {
  outputEl.innerHTML = marked.parse(inputEl.value) as string;
};

inputEl.value = SAMPLE;
inputEl.addEventListener("input", render);
render();
