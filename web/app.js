import { state, dom } from "./state.js";
import {
  loadPlayers,
  loadColumns,
  loadColumnOptions,
  searchMatches,
  buildSearchRequest
} from "./api.js";
import { getEnabledColumns } from "./filters.js";
import {
  renderPlayerOptions,
  renderColumnControls,
  renderTable,
  showPlayerLoadError,
  showColumnLoadError,
  setSortChangedHandler
} from "./render.js";

function updatePaginationUi() {
  if (dom.pageNumberInput) {
    dom.pageNumberInput.value = String(state.currentPage);
    dom.pageNumberInput.min = "1";
    dom.pageNumberInput.max = String(Math.max(state.totalPages, 1));
    dom.pageNumberInput.disabled = state.totalPages <= 1;
  }

  if (dom.paginationTotal) {
    dom.paginationTotal.textContent = `of ${Math.max(state.totalPages, 1)}`;
  }

  if (dom.pageGoBtn) {
    dom.pageGoBtn.disabled = state.totalPages <= 1;
  }
}

let latestRequestId = 0;
let sortRefreshTimer = null;
const SORT_REFRESH_DEBOUNCE_MS = 1000;

function cancelScheduledSortRefresh() {
  if (sortRefreshTimer !== null) {
    window.clearTimeout(sortRefreshTimer);
    sortRefreshTimer = null;
  }
}

function scheduleSortRefresh() {
  cancelScheduledSortRefresh();

  sortRefreshTimer = window.setTimeout(() => {
    sortRefreshTimer = null;
    applyFilters(1);
  }, SORT_REFRESH_DEBOUNCE_MS);
}

async function applyFilters(page = 1) {
  const enabledColumns = getEnabledColumns();
  const requestedPage = Math.max(1, Number(page) || 1);
  const requestId = ++latestRequestId;

  try {
    dom.applyBtn.disabled = true;
    dom.applyBtn.textContent = "Loading...";

    if (dom.pageGoBtn) {
      dom.pageGoBtn.disabled = true;
      dom.pageGoBtn.textContent = "Loading...";
    }

    const searchRequest = buildSearchRequest({
      page: requestedPage,
      pageSize: state.pageSize
    });

    const result = await searchMatches(searchRequest);

    if (requestId !== latestRequestId) {
      return;
    }

    state.currentPage = Math.max(1, Number(result.page) || requestedPage);
    state.totalPages = Math.max(1, Number(result.total_pages) || 1);
    state.totalCount = Math.max(0, Number(result.total_count) || 0);

    renderTable(result.rows || [], enabledColumns);

    const totalCount = result.total_count ?? 0;
    const formattedTotal = totalCount.toLocaleString();
    dom.resultsSummary.textContent = `${formattedTotal} records`;

    updatePaginationUi();
  } catch (err) {
    if (requestId !== latestRequestId) {
      return;
    }

    console.error("Failed to load matches:", err);
    renderTable([], enabledColumns);
    dom.resultsSummary.textContent = "Failed to load matches";
    state.currentPage = 1;
    state.totalPages = 1;
    state.totalCount = 0;
    updatePaginationUi();
  } finally {
    if (requestId !== latestRequestId) {
      return;
    }

    dom.applyBtn.disabled = false;
    dom.applyBtn.textContent = "Apply";

    if (dom.pageGoBtn) {
      dom.pageGoBtn.disabled = state.totalPages <= 1;
      dom.pageGoBtn.textContent = "Go";
    }
  }
}

function resetControls() {
  state.selectedPlayers = new Set(
    state.players.map((player) => player.PUUID)
  );
  state.currentPage = 1;
  state.totalPages = 1;
  state.totalCount = 0;
  state.sort.key = "DATE";
  state.sort.direction = "desc";

  renderPlayerOptions();

  // const globalMode = document.querySelector('input[name="filterMode"][value="all"]');
  // if (globalMode) {
  //   globalMode.checked = true;
  // }

  document.querySelectorAll(".column-card").forEach((card) => {
    const key = card.dataset.key;
    const column = state.allColumns.find((c) => c.key === key);
    const enabled = !!column?.default;

    const checkbox = card.querySelector(".column-toggle");
    const filtersWrap = card.querySelector(".filters-wrap");
    const defaultMode = card.querySelector(`input[name="columnMode-${key}"][value="all"]`);
    const columnFilterMode = card.querySelector(".column-filter-mode");

    if (checkbox) {
      checkbox.checked = enabled;
    }

    card.classList.toggle("enabled", enabled);

    if (filtersWrap) {
      filtersWrap.innerHTML = "";
    }

    if (defaultMode) {
      defaultMode.checked = true;
    }

    if (columnFilterMode) {
      columnFilterMode.classList.remove("visible");
    }
  });

  updatePaginationUi();
  cancelScheduledSortRefresh();
  applyFilters(1);
}

function initCollapsibleSettings() {
  function setPanelOpen(isOpen) {
    dom.controlsPanel.classList.toggle("collapsed", !isOpen);
    dom.settingsToggle.setAttribute("aria-expanded", String(isOpen));
    dom.settingsToggleIcon.textContent = isOpen ? "left_panel_close" : "filter_list";

    if (dom.panelBackdrop) {
      dom.panelBackdrop.classList.toggle("visible", isOpen);
    }
  }

  dom.settingsToggle.addEventListener("click", () => {
    const isCurrentlyCollapsed = dom.controlsPanel.classList.contains("collapsed");
    setPanelOpen(isCurrentlyCollapsed);
  });

  dom.panelBackdrop?.addEventListener("click", () => {
    setPanelOpen(false);
  });

  setPanelOpen(true);
}

function initPagination() {
  updatePaginationUi();

  if (!dom.paginationForm) {
    return;
  }

  dom.paginationForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const requestedPage = Number(dom.pageNumberInput?.value);
    const safePage = Math.min(
      Math.max(1, Number.isFinite(requestedPage) ? requestedPage : state.currentPage),
      Math.max(state.totalPages, 1)
    );

    dom.pageNumberInput.value = String(safePage);
    cancelScheduledSortRefresh();
    applyFilters(safePage);
  });
}

async function init() {
  initCollapsibleSettings();
  initPagination();

  dom.applyBtn.addEventListener("click", () => {
    cancelScheduledSortRefresh();
    applyFilters(1);
  });
  dom.resetBtn.addEventListener("click", resetControls);

  try {
    await loadPlayers();
  } catch (err) {
    console.error("Failed to load players:", err);
    showPlayerLoadError();
  }

  try {
    await loadColumns();
  } catch (err) {
    console.error("Failed to load columns:", err);
    showColumnLoadError();
  }

  try {
    await loadColumnOptions();
  } catch (err) {
    console.error("Failed to load column options:", err);
    showColumnLoadError();
  }

  renderPlayerOptions();
  renderColumnControls();

  setSortChangedHandler(() => {
    state.currentPage = 1;
    scheduleSortRefresh();
  });

  await applyFilters(1);
}

init();

function updateScrollbarWidth() {
  const el = document.querySelector(".controls-panel .settings-content");
  if (!el) return;

  const hasScrollbar = el.scrollHeight > el.clientHeight;
  const scrollbarWidth = el.offsetWidth - el.clientWidth;

  el.style.setProperty(
    "--scrollbar-width",
    hasScrollbar ? `${scrollbarWidth}px` : "0px"
  );
}

// run once after initial render
updateScrollbarWidth();

// update on resize
window.addEventListener("resize", updateScrollbarWidth);

// update when filters panel content changes
const observer = new ResizeObserver(updateScrollbarWidth);
const settingsContent = document.querySelector(".controls-panel .settings-content");
if (settingsContent) {
  observer.observe(settingsContent);
}
