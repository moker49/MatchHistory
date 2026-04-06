export const state = {
    CONFIG: {},
    players: [],
    selectedPlayers: new Set(),
    allColumns: [],
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 100,
    sort: {
        key: "DATE",
        direction: "desc"
    }
};

export const defaultSelectedColumnKeys = new Set([
    "PLAYER",
    "GAME_MODE",
    "CHAMPION",
    "DATE",
    "RESULT",
    "KILLS",
    "DEATHS",
    "ASSISTS"
]);

export const dom = {
    playerOptions: document.getElementById("playerOptions"),
    columnsContainer: document.getElementById("columnsContainer"),
    resultsHead: document.getElementById("resultsHead"),
    resultsBody: document.getElementById("resultsBody"),
    resultsSummary: document.getElementById("resultsSummary"),
    paginationForm: document.getElementById("paginationForm"),
    pageNumberInput: document.getElementById("pageNumberInput"),
    paginationTotal: document.getElementById("paginationTotal"),
    pageGoBtn: document.getElementById("pageGoBtn"),
    applyBtn: document.getElementById("applyBtn"),
    resetBtn: document.getElementById("resetBtn"),
    settingsToggle: document.getElementById("settingsToggle"),
    settingsToggleIcon: document.getElementById("settingsToggleIcon"),
    controlsPanel: document.getElementById("controlsPanel"),
    layout: document.querySelector(".layout")
};
