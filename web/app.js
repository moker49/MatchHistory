import { state, dom } from "./state.js";
import {
  loadPlayers,
  loadColumns,
  loadColumnOptions,
  searchMatches,
  buildSearchRequest
} from "./api.js";
import {
  getEnabledColumns,
  OTHER_PLAYER_KEY} from "./filters.js";
import {
  renderPlayerOptions,
  renderColumnControls,
  renderTable,
  renderFilterChips,
  renderRecentSearches,
  showPlayerLoadError,
  showColumnLoadError,
  setSortChangedHandler
} from "./render.js";

const MOBILE_FILTER_PANEL_QUERY = "(max-width: 768px)";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function isMobileLayout() {
  return window.matchMedia(MOBILE_FILTER_PANEL_QUERY).matches;
}

function setPanelOpen(isOpen) {
  dom.controlsPanel.classList.toggle("collapsed", !isOpen);
  dom.settingsToggle.setAttribute("aria-expanded", String(isOpen));
  dom.settingsToggleIcon.textContent = isOpen ? "close" : "filter_list";

  if (dom.panelBackdrop) {
    dom.panelBackdrop.classList.toggle("visible", isOpen);
  }
}

function updateResultsSummary() {
  const totalMatches = Number(state.totalCount) || 0;

  if (!dom.resultsSummary) {
    return;
  }

  dom.resultsSummary.textContent = `${totalMatches.toLocaleString()} matches`;
}

let latestRequestId = 0;
let sortRefreshTimer = null;
const SORT_REFRESH_DEBOUNCE_MS = 300;
const RECENT_SEARCHES_STORAGE_KEY = "matchHistory.recentSearches";
const MAX_RECENT_SEARCHES = 3;


function cloneSearchRequest(searchRequest) {
  return JSON.parse(JSON.stringify(searchRequest));
}

function getRecentSearchRequestKey(searchRequest) {
  const searchKey = cloneSearchRequest(searchRequest);
  delete searchKey.page;
  delete searchKey.pageSize;
  delete searchKey.page_size;

  return JSON.stringify(searchKey);
}

function loadRecentSearches() {
  try {
    const storedSearches = JSON.parse(
      localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) || "[]"
    );

    state.recentSearches = Array.isArray(storedSearches)
      ? storedSearches.slice(0, MAX_RECENT_SEARCHES)
      : [];
  } catch (err) {
    console.warn("Failed to load recent searches:", err);
    state.recentSearches = [];
  }

  renderRecentSearches();
}

function saveRecentSearches() {
  try {
    localStorage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(state.recentSearches)
    );
  } catch (err) {
    console.warn("Failed to save recent searches:", err);
  }
}

function rememberRecentSearch(searchRequest) {
  const storedRequest = cloneSearchRequest(searchRequest);
  delete storedRequest.page;
  delete storedRequest.pageSize;
  delete storedRequest.page_size;

  const searchKey = getRecentSearchRequestKey(storedRequest);

  state.recentSearches = [
    {
      key: searchKey,
      request: storedRequest,
      savedAt: new Date().toISOString()
    },
    ...state.recentSearches.filter((search) => search.key !== searchKey)
  ].slice(0, MAX_RECENT_SEARCHES);

  saveRecentSearches();
  renderRecentSearches();
}

function initPagelessScroll() {
  function scrollListener(event) {
    const lastLoadedPage = state.highestLoadedMatchPage;

    if (lastLoadedPage < 1) {
      return;
    }

    const lastPageRows = document.querySelectorAll(
      `#resultsBody tr[data-match-page="${lastLoadedPage}"]`
    );

    if (lastPageRows.length === 0) {
      return;
    }

    const firstRowOfLastPage = lastPageRows[0];
    const rowRect = firstRowOfLastPage.getBoundingClientRect();

    const scrollTarget = event?.currentTarget;
    const containerBottom =
      scrollTarget === dom.tableWrap
        ? dom.tableWrap.getBoundingClientRect().bottom
        : window.innerHeight;

    const hasEnteredLastPage = rowRect.top < containerBottom;

    if (hasEnteredLastPage) {
      maybeLoadNextMatchPage();
    }
  }

  // window.addEventListener("scroll", scrollListener, { passive: true });
  dom.tableWrap?.addEventListener("scroll", scrollListener, { passive: true });
}

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

function resetPagelessState() {
    state.currentPage = 1;
    state.totalPages = 1;
    state.totalCount = 0;
    state.loadedMatchPages.clear();
    state.highestLoadedMatchPage = 0;
    state.highestRequestedMatchPage = 0;
    state.isLoadingNextMatchPage = false;
    state.hasMoreMatchPages = true;
}

function resetResultsScrollPosition() {
  if (dom.tableWrap) {
    dom.tableWrap.scrollTop = 0;
  }

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}

function maybeLoadNextMatchPage() {
  if (!state.hasMoreMatchPages) {
    return;
  }

  if (state.isLoadingNextMatchPage) {
    return;
  }

  if (state.highestLoadedMatchPage < 1) {
    return;
  }

  if (state.highestRequestedMatchPage > state.highestLoadedMatchPage) {
    return;
  }

  const nextPage = state.highestLoadedMatchPage + 1;
  applyFilters(nextPage, { append: true });
}

async function applyFilters(page = 1, { append = false, remember = true } = {}) {
  const enabledColumns = getEnabledColumns();
  const requestedPage = Math.max(1, Number(page) || 1);
  const requestId = ++latestRequestId;

 
  try {
    dom.applyBtn.disabled = true;
    dom.applyBtn.textContent = "Loading...";

    if (!append && isMobileLayout()) {
      await delay(75);
      setPanelOpen(false);
      await new Promise(requestAnimationFrame);
    }

    const searchRequest = buildSearchRequest({
      page: requestedPage,
      pageSize: state.pageSize
    });

    if (append) {
      state.isLoadingNextMatchPage = true;
      state.highestRequestedMatchPage = Math.max(
        state.highestRequestedMatchPage,
        requestedPage
      );
    } else {
      resetResultsScrollPosition();
      resetPagelessState();
    }
    
    const result = await searchMatches(searchRequest);

    if (requestId !== latestRequestId) {
      return;
    }

    state.currentPage = Math.max(1, Number(result.page) || requestedPage);
    state.totalPages = Math.max(1, Number(result.total_pages) || 1);
    state.totalCount = Math.max(0, Number(result.total_count) || 0);

    state.loadedMatchPages.add(state.currentPage);
    state.highestLoadedMatchPage = Math.max(
      state.highestLoadedMatchPage,
      state.currentPage
    );
    state.highestRequestedMatchPage = Math.max(
      state.highestRequestedMatchPage,
      state.currentPage
    );
    state.hasMoreMatchPages =
    typeof result.has_more === "boolean"
      ? result.has_more
      : state.currentPage < state.totalPages;

    const rows = (result.rows || []).map((row) => ({
      ...row,
      __matchPage: state.currentPage
    }));

    if (!append) {
      renderFilterChips(searchRequest);

      if (remember) {
        rememberRecentSearch(searchRequest);
      }
    }

    updateResultsSummary();
    renderTable(rows, enabledColumns, { append });
  } catch (err) {
    if (requestId !== latestRequestId) {
      return;
    }

    console.error("Failed to load matches:", err);
    renderTable([], enabledColumns);
    resetPagelessState();
    updateResultsSummary();
    dom.resultsSummary.textContent = "Failed to load";
  } finally {
    if (append) {
      state.isLoadingNextMatchPage = false;
    }

    if (requestId !== latestRequestId) {
      return;
    }

    dom.applyBtn.disabled = false;
    dom.applyBtn.textContent = "Apply";
  }
}

function resetControls() {
  state.selectedPlayers = new Set(
    state.players
      .map((player) => player.PUUID)
      .filter((puuid) => puuid !== OTHER_PLAYER_KEY)
  );
  resetPagelessState();
  state.sort.key = "DATE";
  state.sort.direction = "desc";

  renderPlayerOptions();

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

  renderFilterChips({});
  updateResultsSummary();
  cancelScheduledSortRefresh();
  applyFilters(1, { remember: false });
}

function initCollapsibleSettings() {
  dom.settingsToggle.addEventListener("click", () => {
    const isCurrentlyCollapsed = dom.controlsPanel.classList.contains("collapsed");
    setPanelOpen(isCurrentlyCollapsed);
  });

  dom.panelBackdrop?.addEventListener("click", () => {
    setPanelOpen(false);
  });

  dom.mobileFiltersBtn?.addEventListener("click", () => {
    setPanelOpen(true);
  });

  function toggleTableCompact() {
    const isComfortable = document.body.classList.toggle("mobile-table-comfortable");
    const isCompact = !isComfortable;

    dom.mobileTableCompactBtn.setAttribute("aria-pressed", isCompact ? "true" : "false");
    dom.mobileTableCompactBtn.setAttribute(
      "aria-label",
      isCompact ? "Disable compact table" : "Enable compact table"
    );

    if (dom.mobileTableCompactIcon) {
      dom.mobileTableCompactIcon.textContent = isCompact
        ? "arrows_outward"
        : "horizontal_align_center";
    }

    renderTable(state.lastRows || [], state.lastVisibleColumnKeys || []); 
  }

  dom.mobileTableCompactBtn?.addEventListener("click", toggleTableCompact);

  const startsOpen = !dom.controlsPanel.classList.contains("collapsed");
  setPanelOpen(startsOpen);

  if (dom.panelBackdrop) {
    dom.panelBackdrop.classList.toggle("visible", startsOpen);
  }
}

async function init() {
  loadRecentSearches();
  initCollapsibleSettings();
  initPagelessScroll();

  window.matchMedia("(max-width: 768px)").addEventListener("change", () => {
    renderTable(state.lastRows || [], state.lastVisibleColumnKeys || []);
  });

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

  renderPlayerOptions();
  renderColumnControls();
  renderRecentSearches();

  setSortChangedHandler(() => {
    resetPagelessState();
    scheduleSortRefresh();
  });

  const columnOptionsPromise = loadColumnOptions()
    .then(() => {
      renderColumnControls();
      renderRecentSearches();
    });

  const initialSearchPromise = applyFilters(1, { remember: false }).catch((err) => {
    console.error("Failed to load initial matches:", err);
  });

  await Promise.all([
    columnOptionsPromise,
    initialSearchPromise
  ]);
}

init();
