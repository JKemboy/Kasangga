import { Link } from "react-router-dom";
import termsText from "../content/terms-conditions.txt?raw";

const lines = termsText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);
const isSection = (line) => /^(?:[12]\. |Part [AB] — |[AB]\d+\. )/.test(line);
const sections = lines
  .map((text, index) => ({ text, index }))
  .filter(({ text }) => isSection(text));

export function TermsContent({ includeMetadata = false }) {
  return (
    <>
      {includeMetadata && (
        <p className="mb-4 text-xs leading-5 text-slate-500">{lines[1]}</p>
      )}
      <div className="space-y-3 text-left text-sm leading-6 [overflow-wrap:anywhere]">
        {lines.slice(2).map((line, offset) => {
          const index = offset + 2;
          if (isSection(line))
            return (
              <h2
                id={`terms-${index}`}
                key={index}
                className="scroll-mt-5 border-t border-[#e0e7f0] pt-4 text-base font-bold text-[#087542]"
              >
                {line}
              </h2>
            );
          if (
            line.length < 85 &&
            !/[.!?:;]$/.test(line) &&
            !line.startsWith("Source:")
          )
            return (
              <h3 key={index} className="pt-2 font-semibold">
                {line}
              </h3>
            );
          return <p key={index}>{line}</p>;
        })}
      </div>
    </>
  );
}

export default function TermsConditions() {
  return (
    <main className="min-h-screen bg-[#f7faf8] px-4 py-6 text-[#18233d] sm:py-10">
      <article className="mx-auto max-w-4xl rounded-xl border border-[#e0e7f0] bg-white p-5 sm:p-8">
        <Link
          to="/register"
          className="text-sm font-semibold text-[#087542] underline underline-offset-2"
        >
          Back to registration
        </Link>
        <header className="mt-5 border-b border-[#e0e7f0] pb-5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {lines[0]}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#566584]">{lines[1]}</p>
        </header>
        <nav
          aria-label="Terms and Conditions contents"
          className="my-5 rounded-lg bg-[#eff8f3] p-4"
        >
          <p className="mb-2 text-sm font-semibold">Contents</p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {sections.map(({ text, index }) => (
              <li key={index}>
                <a
                  href={`#terms-${index}`}
                  className="text-[#087542] underline-offset-2 hover:underline"
                >
                  {text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <TermsContent />
      </article>
    </main>
  );
}
