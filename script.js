function initEpubReader(bookPath, initialLocation) {
  const book = ePub(bookPath);
  const rendition = book.renderTo("viewer", {
    width: "100%",
    height: "100%",
    flow: "paginated",
    spread: "always",
    minSpreadWidth: 800,
  });

  const storageKey = `epub-position-${bookPath.replace(/[^a-z0-9]/gi, '-')}`;

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

  book.ready.then(() => {
    if (initialLocation) {
      rendition.display(initialLocation);
    } 
    else {
      const savedPosition = localStorage.getItem(storageKey);
      if (savedPosition) {
        rendition.display(savedPosition);
        updateLocationInUrl(savedPosition);
      } else {
        rendition.display();
      }
    }
  });

  const viewer = document.getElementById("viewer");

  function updateLocationInUrl(cfi) {
    const newUrl = `${globalThis.location.pathname}?loc=${encodeURIComponent(cfi)}`;
    history.replaceState(null, "", newUrl);
  }

  // cfi = canonical fragment identifier
  rendition.on("relocated", function(location) {
    const cfi = location.start.cfi;
    updateLocationInUrl(cfi);
    localStorage.setItem(storageKey, cfi);
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

  document.addEventListener("keyup", function(e) {
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
