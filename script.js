function initEpubReader(bookPath, initialLocation) {
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

  // Store the current location
  book.ready.then(() => {
    if (initialLocation) {
      // Try to restore from the saved location
      rendition.display(initialLocation);
    } else {
      rendition.display();
    }
  });

  const viewer = document.getElementById("viewer");

  // Update the URL with the current CFI
  function updateLocationInUrl(cfi) {
    const newUrl = `${bookPath}/${encodeURIComponent(cfi)}`;
    history.replaceState(null, "", newUrl);
  }

  // Listen to location changes
  rendition.on("relocated", function (location) {
    const cfi = location.start.cfi;
    updateLocationInUrl(cfi);
  });

  function handleNavigation(x) {
    const width = globalThis.innerWidth;
    const third = width / 3;

    if (x < third) {
      rendition.prev();
    } else if (x > third * 2) {
      rendition.next();
    }
  }

  document.addEventListener("keyup", function (e) {
    if (e.keyCode == 37) rendition.prev();
    if (e.keyCode == 39) rendition.next();
  });

  rendition.on("click", (e) => {
    handleNavigation(e.clientX);
  });

  viewer.addEventListener("click", (e) => {
    if (e.target !== viewer && viewer.contains(e.target)) return;
    handleNavigation(e.clientX);
  });

  document.addEventListener("click", (e) => {
    if (e.target === viewer || viewer.contains(e.target)) return;
    handleNavigation(e.clientX);
  });
}

globalThis.initEpubReader = initEpubReader;
