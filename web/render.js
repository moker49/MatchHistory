import { state, dom } from "./state.js";
import { getOperatorOptions } from "./filters.js";

let sortChangedHandler = null;
export function setSortChangedHandler(handler) {
  sortChangedHandler = typeof handler === "function" ? handler : null;
}

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

  if (column.type === "number") {
    return `
      <div class="number-input">
        <button type="button" class="number-btn minus">−</button>
        <input
          class="filter-input"
          type="number"
          min="0"
          step="1"
          placeholder="value"
          value="${escapeHtml(inputValue)}"
        />
        <button type="button" class="number-btn plus">+</button>
      </div>
    `;
  }

  const inputType =
    column.type === "date" ? "date" : "text";

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

  row.querySelectorAll(".number-btn").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();

      const wrapper = btn.closest(".number-input");
      const input = wrapper?.querySelector("input[type='number']");
      if (!input) return;

      const step = Number(input.step) || 1;
      const min = input.min !== "" ? Number(input.min) : null;
      const max = input.max !== "" ? Number(input.max) : null;
      const current = input.value === "" ? 0 : Number(input.value);

      let nextValue = btn.classList.contains("plus")
        ? current + step
        : current - step;

      if (min !== null) {
        nextValue = Math.max(min, nextValue);
      }

      if (max !== null) {
        nextValue = Math.min(max, nextValue);
      }

      input.value = String(nextValue);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

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
        <div class="filters-wrap"></div>

        <button type="button" class="add-filter-btn">+ Add filter</button>

        <div class="column-filter-mode">
          <label class="logic-option">
            <input type="radio" name="columnMode-${column.key}" value="all" checked />
            <span>AND</span>
          </label>
          <label class="logic-option">
            <input type="radio" name="columnMode-${column.key}" value="any" />
            <span>OR</span>
          </label>
        </div>
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

function formatDateCell(value) {
  if (!value) return "";

  const date = new Date(value);
  if (isNaN(date)) return value;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  const datePart = `${month}-${day}-${year}`;

  const timePart = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).toLowerCase();

  return `
    <span class="date-cell">
      <span class="date-main">${datePart}</span>
      <span class="date-time">${timePart}</span>
    </span>
  `;
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

  if (column.key === "DATE") {
    return formatDateCell(value);
  }

  return escapeHtml(value);
}

function isSortableColumn(column) {
  return column.type === "number" || column.type === "date";
}

function getSortIndicator(column) {
  if (!isSortableColumn(column)) {
    return "";
  }

  if (state.sort.key !== column.key) {
    return "⇅";
  }

  return state.sort.direction === "asc" ? "▲" : "▼";
}

function toggleSort(column) {
  if (!isSortableColumn(column)) {
    return;
  }

  if (state.sort.key === column.key) {
    state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
  } else {
    state.sort.key = column.key;
    state.sort.direction = "desc";
  }

  renderTable(state.lastRows || [], state.lastVisibleColumnKeys || []);

  if (sortChangedHandler) {
    sortChangedHandler({
      key: state.sort.key,
      direction: state.sort.direction
    });
  }
}

export function renderTable(rows, visibleColumnKeys) {
  state.lastRows = rows;
  state.lastVisibleColumnKeys = visibleColumnKeys;

  const visibleColumns = state.allColumns.filter((col) =>
    visibleColumnKeys.includes(col.key)
  );

  dom.resultsHead.innerHTML = `
    <tr>
      ${visibleColumns.map((col) => {
    const sortable = isSortableColumn(col);
    const isActiveSort = state.sort.key === col.key;
    const indicator = getSortIndicator(col);

    if (!sortable) {
      return `<th>${escapeHtml(col.label)}</th>`;
    }

    return `
          <th>
            <button
              type="button"
              class="table-sort-btn ${isActiveSort ? "active" : ""}"
              data-sort-key="${escapeHtml(col.key)}"
              aria-label="Sort by ${escapeHtml(col.label)} ${isActiveSort ? state.sort.direction : "ascending"}"
            >
              <span class="table-sort-label">${escapeHtml(col.label)}</span>
              <span class="table-sort-indicator" aria-hidden="true">${indicator}</span>
            </button>
          </th>
        `;
  }).join("")}
    </tr>
  `;

  dom.resultsHead.querySelectorAll(".table-sort-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const columnKey = button.dataset.sortKey;
      const column = state.allColumns.find((col) => col.key === columnKey);

      if (column) {
        toggleSort(column);
      }
    });
  });

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