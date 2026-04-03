import { state, mockData } from "./state.js";

export function getOperatorOptions(type) {
    if (type === "number" || type === "date") {
        return [
            { value: "eq", label: "= equal to" },
            { value: "gt", label: "> greater than" },
            { value: "gte", label: "≥ greater/equal" },
            { value: "lt", label: "< less than" },
            { value: "lte", label: "≤ less/equal" }
        ];
    }

    if (type === "select" || type === "boolean") {
        return [
            { value: "equals", label: "is" }
        ];
    }

    return [
        { value: "contains", label: "contains" },
        { value: "equals", label: "equals" }
    ];
}

export function getSelectedPlayers() {
    return Array.from(state.selectedPlayers);
}

export function getGlobalFilterMode() {
    const checked = document.querySelector('input[name="filterMode"]:checked');
    return checked ? checked.value : "all";
}

export function getEnabledColumns() {
    return Array.from(document.querySelectorAll(".column-card"))
        .filter((card) => card.querySelector(".column-toggle").checked)
        .map((card) => card.dataset.key);
}

export function getActiveFilters() {
    return Array.from(document.querySelectorAll(".column-card"))
        .filter((card) => card.querySelector(".column-toggle").checked)
        .filter((card) => card.dataset.key !== "PLAYER")
        .map((card) => {
            const key = card.dataset.key;
            const type = card.dataset.type;
            const rows = Array.from(card.querySelectorAll(".filter-row"));
            const modeInput = card.querySelector(`input[name="columnMode-${key}"]:checked`);
            const mode = modeInput ? modeInput.value : "all";

            const filters = rows.map((row) => {
                const operatorInput = row.querySelector(".filter-select");
                const valueInput = row.querySelector(".filter-input");

                if (!operatorInput || !valueInput) {
                    return null;
                }

                const operator = operatorInput.value;
                const rawValue = valueInput.value.trim();

                if (!operator || rawValue === "") {
                    return null;
                }

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

            return { key, mode, filters };
        })
        .filter(Boolean);
}

export function matchesFilter(rowValue, filter) {
    if (filter.type === "number") {
        const num = Number(rowValue);

        switch (filter.operator) {
            case "eq": return num === filter.value;
            case "gt": return num > filter.value;
            case "gte": return num >= filter.value;
            case "lt": return num < filter.value;
            case "lte": return num <= filter.value;
            default: return true;
        }
    }

    if (filter.type === "date") {
        const left = new Date(rowValue).getTime();
        const right = new Date(filter.value).getTime();

        if (Number.isNaN(left) || Number.isNaN(right)) {
            return false;
        }

        switch (filter.operator) {
            case "eq": return left === right;
            case "gt": return left > right;
            case "gte": return left >= right;
            case "lt": return left < right;
            case "lte": return left <= right;
            default: return true;
        }
    }

    const left = String(rowValue ?? "").toLowerCase();
    const right = String(filter.value ?? "").toLowerCase();

    switch (filter.operator) {
        case "equals": return left === right;
        case "contains": return left.includes(right);
        default: return true;
    }
}

export function buildFilteredRows() {
    const chosenPlayers = getSelectedPlayers();
    const globalFilterMode = getGlobalFilterMode();
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

    return rows;
}