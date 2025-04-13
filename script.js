// https://github.com/futurepress/epub.js/tree/master/examples

function initEpubReader(bookPath, initialLocation) {
  const book = ePub(bookPath);
  const rendition = book.renderTo("viewer", {
    width: "100%",
    height: "100%",
    flow: "paginated",
    spread: "always",
    minSpreadWidth: 800,
  });

  const storageKey = `epub-position-${bookPath.replace(/[^a-z0-9]/gi, "-")}`;

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
      "font-family": "serif",
      "margin": "10px",
    },
    "a": {
      "color": "#ff80ab",
    },
  });

  book.ready.then(() => {
    if (initialLocation) {
      rendition.display(initialLocation);
    } else {
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
    const newUrl = `${globalThis.location.pathname}?loc=${
      encodeURIComponent(cfi)
    }`;
    history.replaceState(null, "", newUrl);
  }

  // cfi = canonical fragment identifier
  rendition.on("relocated", function (location) {
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

  document.addEventListener("keyup", function (e) {
    if (e.keyCode == 37) rendition.prev();
    if (e.keyCode == 39) rendition.next();

    if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey) {
      const keyNum = parseInt(e.key, 10);

      if (keyNum === 0) {
        rendition.display(0);
      } else if (keyNum >= 1 && keyNum <= 9) {
        const spineLength = book.spine.length;
        const spinePos = Math.floor(spineLength * (keyNum / 10));
        rendition.display(
          book.spine.get(Math.min(spinePos, spineLength - 1)).href,
        );
      }
    }

    if (e.key === "?") {
      showKeybindingsModal();
    }
  });

  function showKeybindingsModal() {
    // Create modal if it doesn't exist
    let dialog = document.getElementById("keybindingsDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "keybindingsDialog";
      dialog.innerHTML = `
      <div class="keybindings-content">
        <h3>keyboard shortcuts</h3>
        <ul>
          <li><kbd>← </kbd> previous</li>
          <li><kbd>→</kbd> next</li>
          <li><kbd>0-9</kbd> jump around</li>
        </ul>
        <button id="closeKeybindings">Close</button>
      </div>
    `;
      document.body.appendChild(dialog);

      // Add close button functionality
      document.getElementById("closeKeybindings").addEventListener(
        "click",
        () => {
          dialog.close();
        },
      );
    }

    // Show the modal
    dialog.showModal();
  }

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
