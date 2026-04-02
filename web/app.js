const players = [
  "Efren",
  "Luna",
  "Vex",
  "RivenMain",
  "ShadowFox",
  "Astra",
  "Kairo",
  "PixelMage"
];

const allColumns = [
  { key: "PLAYER", label: "Player", type: "text", default: true },
  { key: "GAME_MODE", label: "Game Mode", type: "text", default: true },
  { key: "CHAMPION", label: "Champion", type: "text", default: true },
  { key: "DATE", label: "Date", type: "text", default: true },
  { key: "WIN", label: "Win", type: "text", default: true },
  { key: "KILLS", label: "Kills", type: "number", default: true },
  { key: "DEATHS", label: "Deaths", type: "number", default: true },
  { key: "ASSISTS", label: "Assists", type: "number", default: true },
  { key: "DURATION", label: "Duration", type: "number", default: false },
  { key: "DOUBLE_KILLS", label: "Double Kills", type: "number", default: false },
  { key: "TRIPLE_KILLS", label: "Triple Kills", type: "number", default: false },
  { key: "QUADRA_KILLS", label: "Quadra Kills", type: "number", default: false },
  { key: "PENTA_KILLS", label: "Penta Kills", type: "number", default: false },
  { key: "LEGENDARY_KILLS", label: "Legendary Kills", type: "number", default: false },
  { key: "DMG_TO_CHAMPS", label: "Damage to Champs", type: "number", default: false },
  { key: "DMG_TO_STRUCT", label: "Damage to Structures", type: "number", default: false },
  { key: "DMG_TAKEN", label: "Damage Taken", type: "number", default: false },
  { key: "DMG_MITIGATED", label: "Damage Mitigated", type: "number", default: false },
  { key: "GOLD", label: "Gold", type: "number", default: false },
  { key: "CREEP_SCORE", label: "Creep Score", type: "number", default: false },
  { key: "DRAGONS", label: "Dragons", type: "number", default: false },
  { key: "BARONS", label: "Barons", type: "number", default: false },
  { key: "LEVEL", label: "Level", type: "number", default: false },
  { key: "FIRST_BLOOD", label: "First Blood", type: "text", default: false },
  { key: "FIRST_TOWER", label: "First Tower", type: "text", default: false },
  { key: "SURRENDER", label: "Surrender", type: "text", default: false },
  { key: "TIME_CC_OTHER", label: "Time CC Others", type: "number", default: false },
  { key: "TIME_DEAD", label: "Time Dead", type: "number", default: false },
  { key: "CRIT", label: "Largest Crit", type: "number", default: false },
  { key: "WARDS_PLACED", label: "Wards Placed", type: "number", default: false },
  { key: "WARDS_KILLED", label: "Wards Killed", type: "number", default: false }
];

const mockData = [
  {
    PLAYER: "Efren",
    GAME_MODE: "CLASSIC",
    CHAMPION: "Ahri",
    DATE: "2026-04-01 21:14",
    WIN: "True",
    KILLS: 11,
    DEATHS: 3,
    ASSISTS: 8,
    DURATION: 1984,
    DOUBLE_KILLS: 1,
    TRIPLE_KILLS: 0,
    QUADRA_KILLS: 0,
    PENTA_KILLS: 0,
    LEGENDARY_KILLS: 0,
    DMG_TO_CHAMPS: 24511,
    DMG_TO_STRUCT: 2140,
    DMG_TAKEN: 16880,
    DMG_MITIGATED: 9200,
    GOLD: 14820,
    CREEP_SCORE: 194,
    DRAGONS: 1,
    BARONS: 0,
    LEVEL: 17,
    FIRST_BLOOD: "Assist",
    FIRST_TOWER: "False",
    SURRENDER: "False",
    TIME_CC_OTHER: 231,
    TIME_DEAD: 102,
    CRIT: 0,
    WARDS_PLACED: 9,
    WARDS_KILLED: 3
  },
  {
    PLAYER: "Luna",
    GAME_MODE: "ARAM",
    CHAMPION: "Lux",
    DATE: "2026-04-01 22:10",
    WIN: "False",
    KILLS: 7,
    DEATHS: 9,
    ASSISTS: 19,
    DURATION: 1322,
    DOUBLE_KILLS: 0,
    TRIPLE_KILLS: 0,
    QUADRA_KILLS: 0,
    PENTA_KILLS: 0,
    LEGENDARY_KILLS: 0,
    DMG_TO_CHAMPS: 22100,
    DMG_TO_STRUCT: 420,
    DMG_TAKEN: 18911,
    DMG_MITIGATED: 6500,
    GOLD: 11340,
    CREEP_SCORE: 41,
    DRAGONS: 0,
    BARONS: 0,
    LEVEL: 15,
    FIRST_BLOOD: "False",
    FIRST_TOWER: "False",
    SURRENDER: "Early",
    TIME_CC_OTHER: 310,
    TIME_DEAD: 188,
    CRIT: 0,
    WARDS_PLACED: 2,
    WARDS_KILLED: 0
  },
  {
    PLAYER: "Efren",
    GAME_MODE: "CLASSIC",
    CHAMPION: "Jinx",
    DATE: "2026-03-31 20:01",
    WIN: "True",
    KILLS: 18,
    DEATHS: 4,
    ASSISTS: 6,
    DURATION: 2244,
    DOUBLE_KILLS: 2,
    TRIPLE_KILLS: 1,
    QUADRA_KILLS: 0,
    PENTA_KILLS: 0,
    LEGENDARY_KILLS: 0,
    DMG_TO_CHAMPS: 33120,
    DMG_TO_STRUCT: 5500,
    DMG_TAKEN: 14550,
    DMG_MITIGATED: 4100,
    GOLD: 17600,
    CREEP_SCORE: 239,
    DRAGONS: 2,
    BARONS: 1,
    LEVEL: 18,
    FIRST_BLOOD: "True",
    FIRST_TOWER: "False",
    SURRENDER: "False",
    TIME_CC_OTHER: 94,
    TIME_DEAD: 121,
    CRIT: 812,
    WARDS_PLACED: 11,
    WARDS_KILLED: 4
  },
  {
    PLAYER: "ShadowFox",
    GAME_MODE: "URF",
    CHAMPION: "Zed",
    DATE: "2026-03-30 23:32",
    WIN: "False",
    KILLS: 13,
    DEATHS: 11,
    ASSISTS: 5,
    DURATION: 1092,
    DOUBLE_KILLS: 1,
    TRIPLE_KILLS: 1,
    QUADRA_KILLS: 0,
    PENTA_KILLS: 0,
    LEGENDARY_KILLS: 0,
    DMG_TO_CHAMPS: 28771,
    DMG_TO_STRUCT: 1311,
    DMG_TAKEN: 19990,
    DMG_MITIGATED: 7200,
    GOLD: 15010,
    CREEP_SCORE: 102,
    DRAGONS: 0,
    BARONS: 0,
    LEVEL: 17,
    FIRST_BLOOD: "False",
    FIRST_TOWER: "Assist",
    SURRENDER: "False",
    TIME_CC_OTHER: 48,
    TIME_DEAD: 175,
    CRIT: 0,
    WARDS_PLACED: 4,
    WARDS_KILLED: 1
  },
  {
    PLAYER: "Astra",
    GAME_MODE: "CLASSIC",
    CHAMPION: "Thresh",
    DATE: "2026-03-30 18:05",
    WIN: "True",
    KILLS: 2,
    DEATHS: 5,
    ASSISTS: 24,
    DURATION: 2103,
    DOUBLE_KILLS: 0,
    TRIPLE_KILLS: 0,
    QUADRA_KILLS: 0,
    PENTA_KILLS: 0,
    LEGENDARY_KILLS: 0,
    DMG_TO_CHAMPS: 12440,
    DMG_TO_STRUCT: 590,
    DMG_TAKEN: 22150,
    DMG_MITIGATED: 28900,
    GOLD: 11120,
    CREEP_SCORE: 38,
    DRAGONS: 0,
    BARONS: 1,
    LEVEL: 16,
    FIRST_BLOOD: "Assist",
    FIRST_TOWER: "Assist",
    SURRENDER: "False",
    TIME_CC_OTHER: 514,
    TIME_DEAD: 164,
    CRIT: 0,
    WARDS_PLACED: 28,
    WARDS_KILLED: 8
  }
];

let selectedPlayers = new Set(players.slice(0, 2));

const playerOptions = document.getElementById("playerOptions");
const columnsContainer = document.getElementById("columnsContainer");
const resultsHead = document.getElementById("resultsHead");
const resultsBody = document.getElementById("resultsBody");
const resultsSummary = document.getElementById("resultsSummary");
const applyBtn = document.getElementById("applyBtn");
const resetBtn = document.getElementById("resetBtn");
const settingsToggle = document.getElementById("settingsToggle");
const settingsToggleIcon = document.getElementById("settingsToggleIcon");
const controlsPanel = document.getElementById("controlsPanel");
const layout = document.querySelector(".layout");

function getOperatorOptions(type) {
  if (type === "number") {
    return [
      { value: "eq", label: "= equal to" },
      { value: "gt", label: "> greater than" },
      { value: "gte", label: "≥ greater/equal" },
      { value: "lt", label: "< less than" },
      { value: "lte", label: "≤ less/equal" }
    ];
  }

  return [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "starts", label: "starts with" }
  ];
}

function renderColumnControls() {
  columnsContainer.innerHTML = "";

  allColumns.forEach((column) => {
    const card = document.createElement("div");
    card.className = `column-card ${column.default ? "enabled" : ""}`;
    card.dataset.key = column.key;
    card.dataset.type = column.type;

    card.innerHTML = `
      <div class="column-top">
        <label class="toggle">
          <input type="checkbox" class="column-toggle" ${column.default ? "checked" : ""} />
          <span>${column.label}</span>
        </label>
        <span class="column-type">${column.type}</span>
      </div>

      <div class="column-filter-mode">
        <label class="segment small-segment">
          <input type="radio" name="columnMode-${column.key}" value="all" checked />
          <span>AND</span>
        </label>
        <label class="segment small-segment">
          <input type="radio" name="columnMode-${column.key}" value="any" />
          <span>OR</span>
        </label>
      </div>

      <div class="filters-wrap"></div>

      <button type="button" class="add-filter-btn">+ Add filter</button>
    `;

    const checkbox = card.querySelector(".column-toggle");
    const filtersWrap = card.querySelector(".filters-wrap");
    const addFilterBtn = card.querySelector(".add-filter-btn");
    const columnFilterMode = card.querySelector(".column-filter-mode");

    function setEnabled(enabled) {
      checkbox.checked = enabled;
      card.classList.toggle("enabled", enabled);
    }

    function updateColumnFilterModeVisibility() {
      const filterCount = filtersWrap.querySelectorAll(".filter-row").length;
      columnFilterMode.classList.toggle("visible", filterCount >= 2);
    }

    function createFilterRow(operatorValue = "", inputValue = "") {
      const row = document.createElement("div");
      row.className = "filter-row";

      const ops = getOperatorOptions(column.type)
        .map((op) => `
          <option value="${op.value}" ${op.value === operatorValue ? "selected" : ""}>
            ${op.label}
          </option>
        `)
        .join("");

      row.innerHTML = `
        <select class="filter-select">
          ${ops}
        </select>
        <input
          class="filter-input"
          type="${column.type === "number" ? "number" : "text"}"
          placeholder="value"
          value="${inputValue}"
        />
        <button type="button" class="remove-filter-btn">x</button>
      `;

      const removeBtn = row.querySelector(".remove-filter-btn");

      row.addEventListener("click", (event) => {
        event.stopPropagation();
      });

      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        row.remove();
        updateColumnFilterModeVisibility();
      });

      filtersWrap.appendChild(row);
      updateColumnFilterModeVisibility();
    }

    checkbox.addEventListener("change", () => {
      setEnabled(checkbox.checked);
    });

    const toggleLabel = card.querySelector(".toggle");
    toggleLabel.addEventListener("click", (event) => {
      if (event.target === checkbox) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setEnabled(!checkbox.checked);
    });

    card.addEventListener("click", (event) => {
      const clickedInsideFilterRow = event.target.closest(".filter-row");
      const clickedAddFilterBtn = event.target.closest(".add-filter-btn");
      const clickedColumnMode = event.target.closest(".column-filter-mode");

      if (clickedInsideFilterRow || clickedAddFilterBtn || clickedColumnMode) {
        return;
      }

      if (event.target === checkbox) {
        return;
      }

      event.preventDefault();
      setEnabled(!checkbox.checked);
    });

    addFilterBtn.addEventListener("click", (event) => {
      event.stopPropagation();

      if (!checkbox.checked) {
        setEnabled(true);
      }

      createFilterRow();
    });

    columnFilterMode.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    updateColumnFilterModeVisibility();

    columnsContainer.appendChild(card);
  });
}

function renderPlayerOptions() {
  playerOptions.innerHTML = players.map((player) => {
    const isSelected = selectedPlayers.has(player);

    return `
      <button
        type="button"
        class="player-option ${isSelected ? "selected" : ""}"
        data-player="${player}"
      >
        <span class="player-option-name">${player}</span>
        <span class="player-option-check">✓</span>
      </button>
    `;
  }).join("");

  playerOptions.querySelectorAll(".player-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const player = btn.dataset.player;

      if (selectedPlayers.has(player)) {
        selectedPlayers.delete(player);
      } else {
        selectedPlayers.add(player);
      }

      renderPlayerOptions();
    });
  });
}

function initPlayers() {
  renderPlayerOptions();
}

function getSelectedPlayers() {
  return Array.from(selectedPlayers);
}

function getFilterMode() {
  const checked = document.querySelector('input[name="filterMode"]:checked');
  return checked ? checked.value : "all";
}

function getEnabledColumns() {
  const cards = Array.from(document.querySelectorAll(".column-card"));
  return cards
    .filter((card) => card.querySelector(".column-toggle").checked)
    .map((card) => card.dataset.key);
}

function getActiveFilters() {
  const cards = Array.from(document.querySelectorAll(".column-card"));

  return cards
    .filter((card) => card.querySelector(".column-toggle").checked)
    .map((card) => {
      const key = card.dataset.key;
      const type = card.dataset.type;
      const rows = Array.from(card.querySelectorAll(".filter-row"));
      const modeInput = card.querySelector(`input[name="columnMode-${key}"]:checked`);
      const mode = modeInput ? modeInput.value : "all";

      const filters = rows.map((row) => {
        const operator = row.querySelector(".filter-select").value;
        const rawValue = row.querySelector(".filter-input").value.trim();

        if (!operator || rawValue === "") return null;

        return {
          key,
          type,
          operator,
          value: type === "number" ? Number(rawValue) : rawValue
        };
      }).filter(Boolean);

      if (filters.length === 0) {
        return null;
      }

      return {
        key,
        mode,
        filters
      };
    })
    .filter(Boolean);
}

function matchesFilter(rowValue, filter) {
  if (filter.type === "number") {
    const num = Number(rowValue);

    switch (filter.operator) {
      case "eq":
        return num === filter.value;
      case "gt":
        return num > filter.value;
      case "gte":
        return num >= filter.value;
      case "lt":
        return num < filter.value;
      case "lte":
        return num <= filter.value;
      default:
        return true;
    }
  }

  const left = String(rowValue ?? "").toLowerCase();
  const right = String(filter.value ?? "").toLowerCase();

  switch (filter.operator) {
    case "contains":
      return left.includes(right);
    case "equals":
      return left === right;
    case "starts":
      return left.startsWith(right);
    default:
      return true;
  }
}

function applyFilters() {
  const chosenPlayers = getSelectedPlayers();
  const globalFilterMode = getFilterMode();
  const enabledColumns = getEnabledColumns();
  const activeFilters = getActiveFilters();

  let rows = [...mockData];

  if (chosenPlayers.length > 0) {
    rows = rows.filter((row) => chosenPlayers.includes(row.PLAYER));
  }

  if (activeFilters.length > 0) {
    rows = rows.filter((row) => {
      const columnResults = activeFilters.map((group) => {
        const filterResults = group.filters.map((filter) =>
          matchesFilter(row[filter.key], filter)
        );

        return group.mode === "all"
          ? filterResults.every(Boolean)
          : filterResults.some(Boolean);
      });

      return globalFilterMode === "all"
        ? columnResults.every(Boolean)
        : columnResults.some(Boolean);
    });
  }

  renderTable(rows, enabledColumns);

  resultsSummary.textContent =
    `${rows.length} row(s) • ${chosenPlayers.length || "All"} player selection • ${enabledColumns.length} visible column(s)`;
}

function formatCell(key, value) {
  if (key === "WIN") {
    return value === "True"
      ? `<span class="badge-win">Win</span>`
      : `<span class="badge-loss">Loss</span>`;
  }

  if (key === "DURATION") {
    const minutes = Math.floor(Number(value) / 60);
    const seconds = Number(value) % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  return value ?? "";
}

function renderTable(rows, visibleColumnKeys) {
  const visibleColumns = allColumns.filter((col) =>
    visibleColumnKeys.includes(col.key)
  );

  resultsHead.innerHTML = `
    <tr>
      ${visibleColumns.map((col) => `<th>${col.label}</th>`).join("")}
    </tr>
  `;

  if (rows.length === 0) {
    resultsBody.innerHTML = `
      <tr>
        <td colspan="${Math.max(visibleColumns.length, 1)}" class="empty-state">
          No rows matched the current selection.
        </td>
      </tr>
    `;
    return;
  }

  resultsBody.innerHTML = rows.map((row) => `
    <tr>
      ${visibleColumns.map((col) => `<td>${formatCell(col.key, row[col.key])}</td>`).join("")}
    </tr>
  `).join("");
}

function resetControls() {
  selectedPlayers = new Set(players.slice(0, 2));
  renderPlayerOptions();

  document.querySelector('input[name="filterMode"][value="all"]').checked = true;

  document.querySelectorAll(".column-card").forEach((card) => {
    const key = card.dataset.key;
    const col = allColumns.find((c) => c.key === key);
    const enabled = !!col.default;
  
    const checkbox = card.querySelector(".column-toggle");
    const filtersWrap = card.querySelector(".filters-wrap");
    const defaultMode = card.querySelector(`input[name="columnMode-${key}"][value="all"]`);
    const columnFilterMode = card.querySelector(".column-filter-mode");
  
    checkbox.checked = enabled;
    card.classList.toggle("enabled", enabled);
    filtersWrap.innerHTML = "";
  
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
  settingsToggle.addEventListener("click", () => {
    const collapsed = controlsPanel.classList.toggle("collapsed");

    layout.classList.toggle("settings-collapsed", collapsed);

    settingsToggle.setAttribute("aria-expanded", String(!collapsed));
    settingsToggleIcon.textContent = collapsed ? "+" : "−";
  });
}

function init() {
  initPlayers();
  renderColumnControls();
  applyFilters();
  initCollapsibleSettings();

  applyBtn.addEventListener("click", applyFilters);
  resetBtn.addEventListener("click", resetControls);
}

init();