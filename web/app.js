import { state, dom } from "./state.js";
import { loadConfig, loadPlayers, loadColumns, loadColumnOptions } from "./api.js";
import { buildFilteredRows, getEnabledColumns } from "./filters.js";
import {
  renderPlayerOptions,
  renderColumnControls,
  renderTable,
  showPlayerLoadError,
  showColumnLoadError
} from "./render.js";

function applyFilters() {
  const rows = buildFilteredRows();
  const enabledColumns = getEnabledColumns();

  renderTable(rows, enabledColumns);
  dom.resultsSummary.textContent = `${rows.length} record(s)`;
}

function resetControls() {
  state.selectedPlayers = new Set(
    state.players.slice(0, 2).map((player) => player.PLAYER)
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

  applyFilters();
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

  dom.applyBtn.addEventListener("click", applyFilters);
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
    console.error("Failed to load columns:", err);
    showColumnLoadError();
  }

  renderPlayerOptions();
  renderColumnControls();

  applyFilters();
}

init();