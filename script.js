// https://github.com/futurepress/epub.js/tree/master/examples

function setupSomaFmPlayer(dialog) {
  const audioButton = dialog.querySelector("#somaFmToggle");
  let audioPlayer = null;

  audioButton.addEventListener("click", () => {
    if (!audioPlayer) {
      audioPlayer = new Audio("https://ice6.somafm.com/dronezone-64-aac");
      audioPlayer.addEventListener("playing", () => {
        audioButton.innerHTML = "⏹️"; // Stop symbol
        audioButton.title = "Stop Dronezone";
      });
      audioPlayer.play();
    } else {
      if (audioPlayer.paused) {
        audioPlayer.play();
        audioButton.innerHTML = "⏹️"; // Stop symbol
        audioButton.title = "Stop Dronezone";
      } else {
        audioPlayer.pause();
        audioButton.innerHTML = "▶️"; // Play symbol
        audioButton.title = "Play Dronezone";
      }
    }
  });
}

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
    body: {
      color: "#dddddd !important",
      "background-color": "#000000",
    },
    "h1, h2, h3, h4, h5, h6": {
      color: "#dddddd !important",
      "margin-bottom": "20px !important",
    },
    p: {
      color: "#dddddd !important",
      "font-family": "serif",
      margin: "10px",
    },
    a: {
      color: "#ff80ab !important",
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
    const newUrl = `${globalThis.location.pathname}?loc=${encodeURIComponent(
      cfi,
    )}`;
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

  document.addEventListener("keydown", function (e) {
    if (e.key === " " && !e.shiftKey) rendition.next();
    if (e.key === " " && e.shiftKey) rendition.prev();
    if (e.key === "ArrowRight") rendition.next();
    if (e.key === "ArrowLeft") rendition.prev();

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

  function buildTocHtml(items, level = 0) {
    return items
      .map((item) => {
        if (level === 0) {
          if (item.subitems && item.subitems.length > 0) {
            return `<li class="toc-chapter">
            <details>
              <summary class="chapter-title" data-href="${item.href}">${
                item.label
              }</summary>
              <ul class="toc-sublist">${buildTocHtml(
                item.subitems,
                level + 1,
              )}</ul>
            </details>
          </li>`;
          } else {
            // For items without subitems, just use a simple link without details/summary
            return `<li class="toc-chapter">
            <a href="#" class="chapter-title" data-href="${item.href}">${item.label}</a>
          </li>`;
          }
        } else {
          // For sub-items (nested under chapters)
          return `<li class="toc-level-${level}">
          <a href="#" data-href="${item.href}">${item.label}</a>
        </li>`;
        }
      })
      .join("");
  }

  function showKeybindingsModal() {
    let dialog = document.getElementById("keybindingsDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "keybindingsDialog";

      dialog.innerHTML = `
    <div class="keybindings-content">
      <button id="somaFmToggle" class="soma-toggle" title="Play Dronezone">▶️</button>
      <h3>keyboard shortcuts</h3>
      <ul>
        <li><kbd>←</kbd> previous</li>
        <li><kbd>→</kbd> next</li>
        <li><kbd>0-9</kbd> jump around</li>
      </ul>
      
      <h3>chapters</h3>
      <ul id="toc-list" class="toc-list"></ul>
      <button id="closeKeybindings">Close</button>
    </div>
    `;

      document.body.appendChild(dialog);
      setupSomaFmPlayer(dialog);

      const tocList = dialog.querySelector("#toc-list");
      book.loaded.navigation.then((nav) => {
        const toc = nav.toc;

        if (toc.length === 0) {
          tocList.innerHTML = "<li>No chapters found</li>";
        } else {
          tocList.innerHTML = buildTocHtml(toc);

          tocList.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", (e) => {
              e.preventDefault();
              rendition.display(link.dataset.href);
            });
          });

          tocList.querySelectorAll(".chapter-title").forEach((title) => {
            title.addEventListener("click", (e) => {
              e.preventDefault();

              if (title.dataset.href) {
                rendition.display(title.dataset.href);
              }

              const details = title.closest("details");
              if (details) {
                setTimeout(() => {
                  details.open = true;
                }, 0);
              }
            });
          });
        }
      });

      document
        .getElementById("closeKeybindings")
        .addEventListener("click", () => {
          dialog.close();
        });
    }

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
