import { state, defaultSelectedColumnKeys } from "./state.js";
import {
    getSelectedPlayers,
    getIncludeOtherPlayers,
    OTHER_PLAYER_KEY,
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
    { PUUID: "wlgaFlDfW1y9v4LKFs1dvV8KPAR4RMhDDwRKjFJ_eoX74dQF5jUjrrOpsZlbhNCRVWlvjt0IMzPAYg", PLAYER: "Kleber" },
    { PUUID: "uk17B74sho6C2HjZyvJKUoB5mJYjgfxsguKjDHZZRrjt7ia77Jvy3jzFwVLbVNG_33pgSNMrvHFoyQ", PLAYER: "Russel" }
];

const OTHER_PLAYER_OPTION = { PUUID: OTHER_PLAYER_KEY, PLAYER: "Randoms" };

const HARDCODED_COLUMNS = [
    { key: "MATCH_ID", label: "Match ID", type: "text", compact: "Match" },
    { key: "PLAYER", label: "Player", type: "select" },
    { key: "GAME_MODE", label: "Game Mode", type: "select", compact: "Mode" },
    { key: "CHAMPION", label: "Champion", type: "select", compact: "Champ" },
    { key: "DATE", label: "Date", type: "date" },
    { key: "DURATION", label: "Duration", type: "number", compact: "Dur" },
    { key: "RESULT", label: "Result", type: "select", compact: "W/L" },

    { key: "KILLS", label: "Kills", type: "number", compact: "K" },
    { key: "DEATHS", label: "Deaths", type: "number", compact: "D" },
    { key: "ASSISTS", label: "Assists", type: "number", compact: "A" },

    { key: "DOUBLE_KILLS", label: "Double Kills", type: "number", compact: "2x" },
    { key: "TRIPLE_KILLS", label: "Triple Kills", type: "number", compact: "3x" },
    { key: "QUADRA_KILLS", label: "Quadra Kills", type: "number", compact: "4x" },
    { key: "PENTA_KILLS", label: "Penta Kills", type: "number", compact: "5x" },
    { key: "LEGENDARY_KILLS", label: "Legendary Kills", type: "number", compact: "6x" },

    { key: "DMG_TO_CHAMPS", label: "Damage To Champs", type: "number", compact: "ChampDmg" },
    { key: "DMG_TO_STRUCT", label: "Damage To Structures", type: "number", compact: "StructDmg" },
    { key: "DMG_TAKEN", label: "Damage Taken", type: "number", compact: "DmgTaken" },
    { key: "DMG_MITIGATED", label: "Damage Mitigated", type: "number", compact: "DmgMit" },

    { key: "GOLD", label: "Gold", type: "number" },
    { key: "CREEP_SCORE", label: "Creep Score", type: "number", compact: "CS" },
    { key: "DRAGONS", label: "Dragons", type: "number", compact: "Drag" },
    { key: "BARONS", label: "Barons", type: "number", compact: "Baron" },
    { key: "LEVEL", label: "Level", type: "number", compact: "Lvl" },

    { key: "FIRST_BLOOD", label: "First Blood", type: "select", compact: "FB" },
    { key: "FIRST_TOWER", label: "First Tower", type: "select", compact: "FT" },
    { key: "SURRENDER", label: "Surrender", type: "select", compact: "Surr" },

    { key: "TIME_CC_OTHER", label: "Time CC Other", type: "number", compact: "CC" },
    { key: "TIME_DEAD", label: "Time Dead", type: "number", compact: "Dead" },
    { key: "CRIT", label: "Largest Crit", type: "number", compact: "Crit" },

    { key: "SPELL_1_CAST", label: "Spell 1 Casts", type: "number", compact: "Q" },
    { key: "SPELL_2_CAST", label: "Spell 2 Casts", type: "number", compact: "W" },
    { key: "SPELL_3_CAST", label: "Spell 3 Casts", type: "number", compact: "E" },
    { key: "SPELL_4_CAST", label: "Spell 4 Casts", type: "number", compact: "R" },

    { key: "SUMM_1_CAST", label: "Summoner 1 Casts", type: "number", compact: "Sum1" },
    { key: "SUMM_2_CAST", label: "Summoner 2 Casts", type: "number", compact: "Sum2" },
    { key: "SUMM_1_ID", label: "Summoner 1 ID", type: "number", compact: "Sum1ID" },
    { key: "SUMM_2_ID", label: "Summoner 2 ID", type: "number", compact: "Sum2ID" },

    { key: "WARDS_PLACED", label: "Wards Placed", type: "number", compact: "Wards+" },
    { key: "WARDS_KILLED", label: "Wards Killed", type: "number", compact: "Wards-" }
];

async function fetchJson(url) {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${response.status})`);
    }

    return data;
}

function getApiBaseUrl() {
    return "";
}

export async function loadPlayers() {
    state.players = [...HARDCODED_PLAYERS, OTHER_PLAYER_OPTION];

    state.selectedPlayers = new Set(
        state.players
            .map((player) => player.PUUID)
            .filter((puuid) => puuid !== OTHER_PLAYER_KEY)
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

export function buildSearchRequest({ page = state.currentPage, pageSize = state.pageSize } = {}) {
    const sortKey = state.sort?.key || null;
    const sortDirection = state.sort?.direction === "asc" ? "asc" : "desc";

    return {
        players: getSelectedPlayers(),
        include_other_players: getIncludeOtherPlayers(),
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