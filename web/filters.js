import { state } from "./state.js";

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
            { value: "equals", label: "is" },
            { value: "not", label: "is not" }
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
    // const checked = document.querySelector('input[name="filterMode"]:checked');
    // return checked ? checked.value : "all";
    return "all";
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