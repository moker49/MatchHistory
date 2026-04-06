import { state, dom } from "./state.js";
import {
  loadConfig,
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
  showColumnLoadError
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

async function applyFilters(page = 1) {
  const enabledColumns = getEnabledColumns();
  const requestedPage = Math.max(1, Number(page) || 1);

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

    state.currentPage = Math.max(1, Number(result.page) || requestedPage);
    state.totalPages = Math.max(1, Number(result.total_pages) || 1);
    state.totalCount = Math.max(0, Number(result.total_count) || 0);

    renderTable(result.rows || [], enabledColumns);

    const totalCount = result.total_count ?? 0;
    const formattedTotal = totalCount.toLocaleString();
    dom.resultsSummary.textContent = `${formattedTotal} matches`;
    
    updatePaginationUi();
  } catch (err) {
    console.error("Failed to search matches:", err);
    renderTable([], enabledColumns);
    dom.resultsSummary.textContent = "Failed to load matches";
    state.currentPage = 1;
    state.totalPages = 1;
    state.totalCount = 0;
    updatePaginationUi();
  } finally {
    dom.applyBtn.disabled = false;
    dom.applyBtn.textContent = "Refresh";

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

  renderPlayerOptions();

  const globalMode = document.querySelector('input[name="filterMode"][value="all"]');
  if (globalMode) {
    globalMode.checked = true;
  }

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
  applyFilters(1);
}

function initCollapsibleSettings() {
  dom.settingsToggle.addEventListener("click", () => {
    const collapsed = dom.controlsPanel.classList.toggle("collapsed");

    dom.layout.classList.toggle("settings-collapsed", collapsed);
    dom.settingsToggle.setAttribute("aria-expanded", String(!collapsed));
    dom.settingsToggleIcon.textContent = collapsed ? "+" : "−";
  });
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
    applyFilters(safePage);
  });
}

async function init() {
  initCollapsibleSettings();
  initPagination();

  dom.applyBtn.addEventListener("click", () => applyFilters(1));
  dom.resetBtn.addEventListener("click", resetControls);

  await loadConfig();

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

  await applyFilters(1);
}

init();
