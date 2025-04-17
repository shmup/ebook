import { extname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const staticFiles = {
  "/epub.js": {
    path: "./epub.js",
    contentType: "application/javascript",
  },
  "/favicon.ico": { path: "./favicon.ico", contentType: "image/x-icon" },
  "/jszip.min.js": {
    path: "./jszip.min.js",
    contentType: "application/javascript",
  },
  "/script.js": { path: "./script.js", contentType: "application/javascript" },
  "/style.css": { path: "./style.css", contentType: "text/css" },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + units[i];
}

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = decodeURIComponent(url.pathname);

  if (path in staticFiles) {
    try {
      const { path: filePath, contentType } =
        staticFiles[path as keyof typeof staticFiles];
      return new Response(await Deno.readFile(filePath), {
        headers: { "content-type": contentType },
      });
    } catch (e) {
      console.error(e);
      return new Response("File not found", { status: 404 });
    }
  }

  const epubMatch = path.match(/^(.*\.epub)\/(.+)?$/);
  if (epubMatch) {
    const [, bookPath, location] = epubMatch;
    const filePath = join("./epubs", bookPath.replace(/^\//, ""));

    try {
      await Deno.stat(filePath); // Just check if file exists
      const html = `<!DOCTYPE html>
      <html lang="en">
        <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width" />
        <title>ebook</title>
        <script src="/jszip.min.js"></script>
        <script src="/epub.js"></script>
        <script src="/script.js"></script>
        <link rel="stylesheet" href="/style.css">
      </head>
      <body>
        <div id="viewer"></div>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            initEpubReader("${bookPath}", ${
        location ? `"${location}"` : "undefined"
      });
          });
        </script>
      </body>
      </html>`;
      return new Response(html, { headers: { "content-type": "text/html" } });
    } catch (e) {
      console.error(e);
      return new Response("EPUB not found", { status: 404 });
    }
  }

  const filePath = join("./epubs", path.replace(/^\//, ""));
  try {
    const stat = await Deno.stat(filePath);

    if (stat.isDirectory) {
      return handleDirectory(filePath, path);
    }

    const file = await Deno.readFile(filePath);
    const filename = path.split("/").pop();
    const isEpub = extname(filePath) === ".epub";

    return new Response(file, {
      headers: {
        "content-type": isEpub
          ? "application/epub+zip"
          : "application/octet-stream",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Not found", { status: 404 });
  }
}

async function handleDirectory(
  filePath: string,
  path: string,
): Promise<Response> {
  const entries = [];
  for await (const entry of Deno.readDir(filePath)) {
    const entryStats = await Deno.stat(join(filePath, entry.name));
    entries.push({
      ...entry,
      size: entryStats.size,
      modified: entryStats.mtime,
    });
  }

  const sortedEntries = entries.sort((a, b) => {
    if (a.isDirectory && b.isDirectory) {
      return a.name.localeCompare(b.name);
    } else if (a.isDirectory) {
      return -1;
    } else if (b.isDirectory) {
      return 1;
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  const html = generateDirectoryTemplate(sortedEntries, path);
  return new Response(html, { headers: { "content-type": "text/html" } });
}

interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  size: number;
  modified: Date | null;
}

function generateDirectoryTemplate(
  entries: DirectoryEntry[],
  path: string,
): string {
  const listing = entries.map((entry) => {
    const isEpub = entry.name.endsWith(".epub");
    const entryPath = path.endsWith("/")
      ? `${path}${entry.name}`
      : `${path}/${entry.name}`;
    const formattedSize = formatFileSize(entry.size);
    const formattedDate = entry.modified
      ? new Date(entry.modified).toLocaleString()
      : "";

    return `<div class="file-entry">
      ${
      isEpub
        ? `<div class="epub-link-container">
              <a href="${entryPath}/">📚</a>&nbsp;&nbsp;<a href="${entryPath}" class="epub-link">${entry.name}
                <svg viewBox="0 0 100 5" class="link-animation">
                  <line x1="0" y1="2.5" x2="100" y2="2.5" stroke="rgb(50,50,50)" stroke-width="2" />
                  <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="5"
                    fill="url(#line_color)"
                    mask="url(#animated_line_mask)"
                    class="animation-rect"
                  />
                </svg>
              </a>
            </div>`
        : entry.name
    }
      <span class="file-modified">${formattedDate}</span>
      <span class="file-size">${formattedSize}</span>
    </div>`;
  }).join("\n");

  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" /><meta name="viewport" content="width=device-width" />
      <title>ebook</title>
      <link rel="stylesheet" href="/style.css">
      <style>
        body { padding: 20px; }

        .epub-link-container {
          position: relative;
          display: inline-block;
        }

        .epub-link {
          position: relative;
          text-decoration: none;
        }

        .link-animation {
          position: absolute;
          bottom: 0px;
          left: 0;
          height: 5px;
          width: 100%;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.1s ease;
        }

        .epub-link:hover .link-animation {
          opacity: 0;
        }

        .animation-rect {
          animation: bounce-horizontal 1s linear infinite;
        }

        @keyframes bounce-horizontal {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      </style>
    </head>
    <body>
      <div class="file-list">
        <div class="file-header">
          <span>Name</span>
          <span class="file-modified">Modified</span>
          <span class="file-size">Size</span>
        </div>
        ${listing}
        <svg style="position: absolute; width: 0; height: 0; overflow: hidden;" version="1.1">
          <defs>
            <linearGradient id="line_color" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="rgba(85,0,255,1.0)" />
              <stop offset="100%" stop-color="rgb(85,0,255,1.0)" />
            </linearGradient>
            <mask id="animated_line_mask">
              <line x1="0" y1="2.5" x2="100" y2="2.5" stroke="white" stroke-width="2" />
            </mask>
          </defs>
        </svg>
      </div>
    </body>
  </html>`;
}

const port = parseInt(Deno.args[0]) || 8083;
Deno.serve({ port, handler });
console.log(`Listening on http://localhost:${port}`);
