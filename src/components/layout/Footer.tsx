import React from "react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-8 text-center text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>
          Node.js Express Mongoose Demo &mdash; Modernized with Next.js 16, React 19 & Tailwind CSS
        </p>
        <div className="flex items-center gap-4 text-xs">
          <a
            href="https://github.com/madhums/node-express-mongoose-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline text-foreground"
          >
            Legacy Source
          </a>
          <span>&bull;</span>
          <span>Native MongoDB & Zod</span>
        </div>
      </div>
    </footer>
  );
}

