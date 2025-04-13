import { extname, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const staticFiles = {
  "/epub.min.js": {
    path: "./epub.min.js",
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
        <script src="/epub.min.js"></script>
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

    // Replace the directory listing section with this:
    if (stat.isDirectory) {
      const entries = [];
      for await (const entry of Deno.readDir(filePath)) {
        const entryStats = await Deno.stat(join(filePath, entry.name));
        entries.push({
          ...entry,
          size: entryStats.size,
          modified: entryStats.mtime,
        });
      }

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
            ? `<a href="${entryPath}/">📚</a>&nbsp;&nbsp;<a href="${entryPath}">${entry.name}</a>`
            : entry.name
        }
      <span class="file-modified">${formattedDate}</span>
      <span class="file-size">${formattedSize}</span>
    </div>`;
      }).join("\n");

      const html = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" /><meta name="viewport" content="width=device-width" />
      <title>ebook</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="file-list">
        <div class="file-header">
          <span>Name</span>
          <span class="file-modified">Modified</span>
          <span class="file-size">Size</span>
        </div>
        ${listing}
      </div>
    </body>
  </html>`;

      return new Response(html, { headers: { "content-type": "text/html" } });
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

const port = parseInt(Deno.args[0]) || 8083;
Deno.serve({ port, handler });
console.log(`Listening on http://localhost:${port}`);
