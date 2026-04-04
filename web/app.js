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

async function applyFilters(page = 1) {
  const enabledColumns = getEnabledColumns();

  try {
    dom.applyBtn.disabled = true;
    dom.applyBtn.textContent = "Loading...";

    const searchRequest = buildSearchRequest({
      page,
      pageSize: 100
    });

    const result = await searchMatches(searchRequest);

    renderTable(result.rows || [], enabledColumns);

    dom.resultsSummary.textContent =
      `${result.total_count ?? 0} record(s) • page ${result.page ?? 1} of ${result.total_pages ?? 0}`;
  } catch (err) {
    console.error("Failed to search matches:", err);
    renderTable([], enabledColumns);
    dom.resultsSummary.textContent = "Failed to load results";
  } finally {
    dom.applyBtn.disabled = false;
    dom.applyBtn.textContent = "Refresh Table";
  }
}

function resetControls() {
  state.selectedPlayers = new Set(
    state.players.map((player) => player.PUUID)
  );

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

async function init() {
  initCollapsibleSettings();

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