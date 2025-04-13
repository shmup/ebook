function initEpubReader(bookPath) {
  const book = ePub(bookPath);
  const rendition = book.renderTo("viewer", {
    width: "100%",
    height: "100%",
    flow: "paginated",
    spread: "always",
    minSpreadWidth: 800,
  });

  rendition.themes.default({
    "body": {
      "color": "#ffffff",
      "background-color": "#000000",
    },
    "h1, h2, h3, h4, h5, h6": {
      "color": "#dddddd",
    },
    "p": {
      "color": "#ffffff",
      "font-family": "Arial, sans-serif",
      "margin": "10px",
    },
    "a": {
      "color": "#ff80ab",
    },
  });

  rendition.display();

  document.addEventListener("keyup", function (e) {
    if (e.keyCode == 37) {
      rendition.prev();
    }
    if (e.keyCode == 39) {
      rendition.next();
    }
  });
}

globalThis.initEpubReader = initEpubReader;
