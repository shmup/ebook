import { join, extname } from "https://deno.land/std@0.224.0/path/mod.ts";

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = decodeURIComponent(url.pathname);

  if (path === "/jszip.min.js" || path === "/epub.min.js") {
    try {
      const file = await Deno.readFile(`.${path}`);
      const contentType = "application/javascript";
      return new Response(file, {
        headers: { "content-type": contentType },
      });
    } catch (e) {
      console.error(e);
      return new Response("File not found", { status: 404 });
    }
  }

  if (path.endsWith('/') && path.toLowerCase().endsWith('.epub/')) {
    console.debug("generating epub viewer");
    const bookPath = path.slice(0, -1);
    const filePath = join("./epubs", bookPath.replace(/^\//, ""));

    try {
      const stat = await Deno.stat(filePath);
      if (stat.isFile) {
        const html = generateHtml(generateEpubViewer(bookPath));
        return new Response(html, {
          headers: { "content-type": "text/html" },
        });
      }
    } catch (e) {
      console.error(e);
      return new Response("EPUB not found", { status: 404 });
    }
  }

  const filePath = join("./epubs", path.replace(/^\//, ""));

  try {
    const stat = await Deno.stat(filePath);

    if (stat.isDirectory) {
      console.debug("generating directory listing");
      const entries = [];
      for await (const entry of Deno.readDir(filePath)) {
        entries.push(entry);
      }

      const html = generateHtml(generateDirectoryListing(path, entries));
      return new Response(html, {
        headers: { "content-type": "text/html" },
      });
    }

    // epub download case (no trailing slash)
    if (extname(filePath) === ".epub") {
      const file = await Deno.readFile(filePath);
      return new Response(file, {
        headers: {
          "content-type": "application/epub+zip",
          "content-disposition": `attachment; filename="${path.split('/').pop()}"`
        },
      });
    }

    // direct file download for other files
    const file = await Deno.readFile(filePath);
    return new Response(file, {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${path.split('/').pop()}"`
      },
    });
  } catch (e) {
    console.error(e);
    return new Response("Not found", { status: 404 });
  }
}

function generateHtml(content: string): string {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width" />
  <title>EPUB Reader</title>
  <script src="/jszip.min.js"></script>
  <script src="/epub.min.js"></script>
  <style>
    #viewer { width: 100%; height: 80vh; margin-top: 20px; }
  </style>
  </head>
  <body>
  ${content}
  </body>
  </html>`;
}

function generateDirectoryListing(dirPath: string, entries: Deno.DirEntry[]): string {
  const rows = entries.map(entry => {
    const isEpub = entry.name.endsWith('.epub');
    const entryPath = dirPath.endsWith('/') ? `${dirPath}${entry.name}` : `${dirPath}/${entry.name}`;
    const link = isEpub ?
      `<a href="${entryPath}/">📚</a>&nbsp;<a href="${entryPath}">${entry.name}</a>` :
      entry.name;

    return `<div class="file-entry">
    ${link}
    </div>`;
  }).join('\n');

  return `<div class="file-list">
    ${rows}
  </div>`;
}

function generateEpubViewer(bookPath: string): string {
  return `<div id="viewer"></div>
  <script>
  document.addEventListener('DOMContentLoaded', function() {
    var book = ePub("${bookPath}");
    var rendition = book.renderTo("viewer", {width: "100%", height: "100%"});
    var displayed = rendition.display();
  });
  </script>`;
}

Deno.serve(handler);
