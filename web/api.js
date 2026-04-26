import { state, defaultSelectedColumnKeys } from "./state.js";
import {
    getSelectedPlayers,
    getGlobalFilterMode,
    getEnabledColumns,
    getActiveFilters
} from "./filters.js";

const HARDCODED_PLAYERS = [
    { PUUID: "HR9wJTRTf0-Gi3BfVEJsnYR4TJtiM7kCtTgCCQnLM_RoiE0fvniJYPVIvgOdlBno7xnpJ79Yu0NwAA", PLAYER: "Efren" },
    { PUUID: "8D6NUU33Guzdv3R43UBBpjZZS7sTlzGjDMmhpoc89CkNks1vhvwob-A4PwlQlvk_n2KCOIw5QkONmw", PLAYER: "Erik" },
    { PUUID: "WVDEw2aG6FP08S0dc9aOZd7eA0G0M9aSov6wPTrGj4DK6WCPWR_Cg-HCapssk-zOChT_9l0lVXx4Hg", PLAYER: "Hanna" },
    { PUUID: "LBn849uoRjZ5UyYJrucUy-YkoJszDfRBlquhfGhz0ftp3jqagl6QBlSNvwES383H1XkZ8JllwmaPoQ", PLAYER: "Karina" },
    { PUUID: "eLii3p9m_AC6OdjtTUUyXU2y0X3zp-I4kyc-QXNu7vBX0IPbANvRx4SZ1M8Aa1Ni48SSoI0-6oZRbw", PLAYER: "Kayla" },
    { PUUID: "R5Tqz9GSjFlgM0nXyjzN0ETtPYecY8X1v5lnYnko8kDykUPmvg0OABUQOeROzEofmlrIQXuxNWggow", PLAYER: "Kevin" },
    { PUUID: "wlgaFlDfW1y9v4LKFs1dvV8KPAR4RMhDDwRKjFJ_eoX74dQF5jUjrrOpsZlbhNCRVWlvjt0IMzPAYg", PLAYER: "Kleber" }
];

const HARDCODED_COLUMNS = [
    { key: "MATCH_ID", label: "Match ID", type: "text" },
    { key: "PLAYER", label: "Player", type: "select" },
    { key: "GAME_MODE", label: "Game Mode", type: "select" },
    { key: "CHAMPION", label: "Champion", type: "select" },
    { key: "DATE", label: "Date", type: "date" },
    { key: "DURATION", label: "Duration", type: "number" },
    { key: "RESULT", label: "Result", type: "boolean" },
    { key: "KILLS", label: "Kills", type: "number" },
    { key: "DEATHS", label: "Deaths", type: "number" },
    { key: "ASSISTS", label: "Assists", type: "number" },
    { key: "DOUBLE_KILLS", label: "Double Kills", type: "number" },
    { key: "TRIPLE_KILLS", label: "Triple Kills", type: "number" },
    { key: "QUADRA_KILLS", label: "Quadra Kills", type: "number" },
    { key: "PENTA_KILLS", label: "Penta Kills", type: "number" },
    { key: "LEGENDARY_KILLS", label: "Legendary Kills", type: "number" },
    { key: "DMG_TO_CHAMPS", label: "Damage To Champs", type: "number" },
    { key: "DMG_TO_STRUCT", label: "Damage To Structures", type: "number" },
    { key: "DMG_TAKEN", label: "Damage Taken", type: "number" },
    { key: "DMG_MITIGATED", label: "Damage Mitigated", type: "number" },
    { key: "GOLD", label: "Gold", type: "number" },
    { key: "CREEP_SCORE", label: "Creep Score", type: "number" },
    { key: "DRAGONS", label: "Dragons", type: "number" },
    { key: "BARONS", label: "Barons", type: "number" },
    { key: "LEVEL", label: "Level", type: "number" },
    { key: "FIRST_BLOOD", label: "First Blood", type: "select" },
    { key: "FIRST_TOWER", label: "First Tower", type: "select" },
    { key: "SURRENDER", label: "Surrender", type: "select" },
    { key: "TIME_CC_OTHER", label: "Time CC Other", type: "number" },
    { key: "TIME_DEAD", label: "Time Dead", type: "number" },
    { key: "CRIT", label: "Largest Crit", type: "number" },
    { key: "SPELL_1_CAST", label: "Spell 1 Casts", type: "number" },
    { key: "SPELL_2_CAST", label: "Spell 2 Casts", type: "number" },
    { key: "SPELL_3_CAST", label: "Spell 3 Casts", type: "number" },
    { key: "SPELL_4_CAST", label: "Spell 4 Casts", type: "number" },
    { key: "SUMM_1_CAST", label: "Summoner 1 Casts", type: "number" },
    { key: "SUMM_2_CAST", label: "Summoner 2 Casts", type: "number" },
    { key: "SUMM_1_ID", label: "Summoner 1 ID", type: "number" },
    { key: "SUMM_2_ID", label: "Summoner 2 ID", type: "number" },
    { key: "WARDS_PLACED", label: "Wards Placed", type: "number" },
    { key: "WARDS_KILLED", label: "Wards Killed", type: "number" }
];

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
    state.players = HARDCODED_PLAYERS;

    state.selectedPlayers = new Set(
        state.players.map((player) => player.PUUID)
    );
}

export async function loadColumns() {
    state.allColumns = HARDCODED_COLUMNS.map((column) => ({
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

    if (!response.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}