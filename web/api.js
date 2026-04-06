import { state, defaultSelectedColumnKeys } from "./state.js";
import {
    getSelectedPlayers,
    getGlobalFilterMode,
    getEnabledColumns,
    getActiveFilters
} from "./filters.js";

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

export function getApiBaseUrl() {
    //return `http://${state.CONFIG.api_host}:${state.CONFIG.api_port}`;
    return "";
}

export async function loadPlayers() {
    const data = await fetchJson(`${getApiBaseUrl()}/api/players`);

    state.players = data.players || [];
    state.selectedPlayers = new Set(
        state.players.map((player) => player.PUUID)
    );
}

export async function loadColumns() {
    const data = await fetchJson(`${getApiBaseUrl()}/api/columns`);

    state.allColumns = (data.columns || []).map((column) => ({
        ...column,
        default: defaultSelectedColumnKeys.has(column.key),
        options: []
    }));
}

export async function loadColumnOptions() {
    try {
        const data = await fetchJson(`${getApiBaseUrl()}/api/column-options`);
        const optionsByListName = data.options || {};

        state.allColumns = state.allColumns.map((column) => ({
            ...column,
            options: Array.isArray(optionsByListName[column.key])
                ? optionsByListName[column.key]
                : []
        }));
    } catch (err) {
        console.error("Failed to load column options:", err);

        state.allColumns = state.allColumns.map((column) => ({
            ...column,
            options: []
        }));
    }
}

export function buildSearchRequest({ page = 1, pageSize = 100 } = {}) {
    const sortKey = state.sort?.key || null;
    const sortDirection = state.sort?.direction === "asc" ? "asc" : "desc";

    return {
        players: getSelectedPlayers(),
        visible_columns: getEnabledColumns(),
        filter_mode: getGlobalFilterMode(),
        filters: getActiveFilters(),
        page,
        page_size: pageSize,
        sort_key: sortKey,
        sort_direction: sortKey ? sortDirection : null
    };
}

export async function searchMatches(searchRequest) {
    const response = await fetch(`${getApiBaseUrl()}/api/matches/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(searchRequest)
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}