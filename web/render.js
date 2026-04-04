import { state, dom } from "./state.js";
import { getOperatorOptions } from "./filters.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function supportsFilters(column) {
  return column.key !== "PLAYER";
}

function updateColumnFilterModeVisibility({ checkbox, filtersWrap, columnFilterMode, supportsColumnFilters }) {
  if (!supportsColumnFilters || !columnFilterMode || !filtersWrap) {
    return;
  }

  const filterCount = filtersWrap.querySelectorAll(".filter-row").length;
  const isEnabled = checkbox.checked;

  columnFilterMode.classList.toggle("visible", isEnabled && filterCount >= 2);
}

function buildValueControlHtml(column, inputValue = "") {
  if (column.type === "boolean") {
    return `
      <select class="filter-input">
        <option value="">select...</option>
        <option value="True" ${inputValue === "True" ? "selected" : ""}>True</option>
        <option value="False" ${inputValue === "False" ? "selected" : ""}>False</option>
      </select>
    `;
  }

  if (column.type === "select" && Array.isArray(column.options) && column.options.length > 0) {
    return `
      <select class="filter-input">
        <option value="">select...</option>
        ${column.options.map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : (option.label ?? option.value);
      return `<option value="${escapeHtml(value)}" ${inputValue === value ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("")}
      </select>
    `;
  }

  const inputType =
    column.type === "number" ? "number" :
      column.type === "date" ? "date" :
        "text";

  return `
    <input
      class="filter-input"
      type="${inputType}"
      placeholder="value"
      value="${escapeHtml(inputValue)}"
    />
  `;
}

function createFilterRow(column, filtersWrap, checkbox, columnFilterMode, operatorValue = "", inputValue = "") {
  const row = document.createElement("div");
  row.className = "filter-row";

  const operatorOptions = getOperatorOptions(column.type);
  const resolvedOperator = operatorValue || operatorOptions[0].value;

  row.innerHTML = `
    <select class="filter-select">
      ${operatorOptions.map((op) => `
        <option value="${op.value}" ${op.value === resolvedOperator ? "selected" : ""}>
          ${op.label}
        </option>
      `).join("")}
    </select>
    ${buildValueControlHtml(column, inputValue)}
    <button type="button" class="remove-filter-btn">x</button>
  `;

  row.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  row.querySelector(".remove-filter-btn").addEventListener("click", (event) => {
    event.stopPropagation();
    row.remove();
    updateColumnFilterModeVisibility({
      checkbox,
      filtersWrap,
      columnFilterMode,
      supportsColumnFilters: true
    });
  });

  filtersWrap.appendChild(row);

  updateColumnFilterModeVisibility({
    checkbox,
    filtersWrap,
    columnFilterMode,
    supportsColumnFilters: true
  });
}

export function showPlayerLoadError() {
  dom.playerOptions.innerHTML = `
    <div class="empty-state">
      Failed to load players.
    </div>
  `;
}

export function showColumnLoadError() {
  dom.columnsContainer.innerHTML = `
    <div class="empty-state">
      Failed to load columns.
    </div>
  `;
}

export function renderPlayerOptions() {
  dom.playerOptions.innerHTML = state.players.map((playerObj) => {
    const playerName = playerObj.PLAYER;
    const puuid = playerObj.PUUID;
    const isSelected = state.selectedPlayers.has(puuid);

    return `
      <button
        type="button"
        class="player-option ${isSelected ? "selected" : ""}"
        data-player="${escapeHtml(playerName)}"
        data-puuid="${escapeHtml(puuid)}"
      >
        <span class="player-option-name">${escapeHtml(playerName)}</span>
        <span class="player-option-check">✓</span>
      </button>
    `;
  }).join("");

  dom.playerOptions.querySelectorAll(".player-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const puuid = btn.dataset.puuid;

      if (state.selectedPlayers.has(puuid)) {
        state.selectedPlayers.delete(puuid);
      } else {
        state.selectedPlayers.add(puuid);
      }

      renderPlayerOptions();
    });
  });
}

export function renderColumnControls() {
  dom.columnsContainer.innerHTML = "";

  state.allColumns.forEach((column) => {
    const card = document.createElement("div");
    const supportsColumnFilters = supportsFilters(column);

    card.className = `column-card ${column.default ? "enabled" : ""}`;
    card.dataset.key = column.key;
    card.dataset.type = column.type;

    card.innerHTML = `
      <div class="column-top">
        <label class="toggle">
          <input type="checkbox" class="column-toggle" ${column.default ? "checked" : ""} />
          <span>${escapeHtml(column.label)}</span>
        </label>
        <span class="column-type">${escapeHtml(column.type)}</span>
      </div>

      ${supportsColumnFilters ? `
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
      ` : ""}
    `;

    const checkbox = card.querySelector(".column-toggle");
    const toggleLabel = card.querySelector(".toggle");
    const filtersWrap = card.querySelector(".filters-wrap");
    const addFilterBtn = card.querySelector(".add-filter-btn");
    const columnFilterMode = card.querySelector(".column-filter-mode");

    function setEnabled(enabled) {
      checkbox.checked = enabled;
      card.classList.toggle("enabled", enabled);

      updateColumnFilterModeVisibility({
        checkbox,
        filtersWrap,
        columnFilterMode,
        supportsColumnFilters
      });
    }

    checkbox.addEventListener("change", () => {
      setEnabled(checkbox.checked);
    });

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

    if (supportsColumnFilters && addFilterBtn && filtersWrap && columnFilterMode) {
      addFilterBtn.addEventListener("click", (event) => {
        event.stopPropagation();

        if (!checkbox.checked) {
          setEnabled(true);
        }

        createFilterRow(column, filtersWrap, checkbox, columnFilterMode);
      });

      columnFilterMode.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    }

    updateColumnFilterModeVisibility({
      checkbox,
      filtersWrap,
      columnFilterMode,
      supportsColumnFilters
    });

    dom.columnsContainer.appendChild(card);
  });
}

export function formatCell(column, value) {
  const key = column.key;

  if (key === "RESULT") {
    if (value === "True") {
      return `<span class="badge-win">Win</span>`;
    } else if (value === "False") {
      return `<span class="badge-loss">Loss</span>`;
    } else if (value === "Remake") {
      return `<span class="badge-redo">Redo</span>`;
    } else {
      return `<span class="badge-unknown">Unknown</span>`;
    }
  }

  if (key === "FIRST_BLOOD") {
    if (value === "True") {
      return `<span class="badge-win">Yes</span>`;
    } else if (value === "False") {
      return `<span class="badge-loss">No</span>`;
    } else if (value === "Assist") {
      return `<span class="badge-win">Assist</span>`;
    } else {
      return `<span class="badge-unknown">Unknown</span>`;
    }
  }

  if (key === "FIRST_TOWER") {
    if (value === "True") {
      return `<span class="badge-win">Yes</span>`;
    } else if (value === "False") {
      return `<span class="badge-loss">No</span>`;
    } else if (value === "Assist") {
      return `<span class="badge-win">Assist</span>`;
    } else {
      return `<span class="badge-unknown">Unknown</span>`;
    }
  }

  if (key === "SURRENDER") {
    if (value === "True") {
      return `<span class="badge-loss">Yes</span>`;
    } else if (value === "False") {
      return `<span class="badge-win">No</span>`;
    } else if (value === "Early") {
      return `<span class="badge-loss">Early</span>`;
    } else {
      return `<span class="badge-unknown">Unknown</span>`;
    }
  }

  if (key === "DURATION") {
    const minutes = Math.floor(Number(value) / 60);
    const seconds = Number(value) % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  if (column.type === "select" && Array.isArray(column.options) && column.options.length > 0) {
    const match = column.options.find((option) => {
      const optionValue = typeof option === "string" ? option : option.value;
      return String(optionValue) === String(value);
    });

    if (match) {
      const label = typeof match === "string" ? match : (match.label ?? match.value);
      return escapeHtml(label);
    }
  }

  if (key === "DATE") {
    const date = new Date(String(value).replace(" ", "T"));

    if (Number.isNaN(date.getTime())) {
      return escapeHtml(value);
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    const parts = formatter.formatToParts(date);

    const get = (type) => parts.find(p => p.type === type)?.value ?? "";

    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}${get("dayPeriod").toLowerCase()}`;
  }

  return escapeHtml(value);
}

export function renderTable(rows, visibleColumnKeys) {
  const visibleColumns = state.allColumns.filter((col) =>
    visibleColumnKeys.includes(col.key)
  );

  dom.resultsHead.innerHTML = `
    <tr>
      ${visibleColumns.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}
    </tr>
  `;

  if (rows.length === 0) {
    dom.resultsBody.innerHTML = `
      <tr>
        <td colspan="${Math.max(visibleColumns.length, 1)}" class="empty-state">
          ¯\\_(ツ)_/¯
        </td>
      </tr>
    `;
    return;
  }

  dom.resultsBody.innerHTML = rows.map((row) => `
    <tr>
      ${visibleColumns.map((col) => `<td>${formatCell(col, row[col.key])}</td>`).join("")}
    </tr>
  `).join("");
}