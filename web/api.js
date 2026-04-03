import { state, defaultSelectedColumnKeys } from "./state.js";

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

export async function loadConfig() {
    try {
        const response = await fetch("config.json");
        state.CONFIG = await response.json();
    } catch (err) {
        console.error("Failed to load config.json:", err);

        state.CONFIG = {
            api_host: "127.0.0.1",
            api_port: 5001,
            api_debug: true
        };
    }
}

export function getApiBaseUrl() {
    return `http://${state.CONFIG.api_host}:${state.CONFIG.api_port}`;
}

export async function loadPlayers() {
    const data = await fetchJson(`${getApiBaseUrl()}/api/players`);

    state.players = data.players || [];
    state.selectedPlayers = new Set(
        state.players.slice(0, 2).map((player) => player.PLAYER)
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