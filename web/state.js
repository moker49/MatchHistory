export const state = {
    players: [],
    selectedPlayers: new Set(),
    allColumns: [],

    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 50,
    lastRows: [],
    lastVisibleColumnKeys: [],
    loadedMatchPages: new Set(),
    highestLoadedMatchPage: 0,
    highestRequestedMatchPage: 0,
    isLoadingNextMatchPage: false,
    hasMoreMatchPages: true,

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
    applyBtn: document.getElementById("applyBtn"),
    resetBtn: document.getElementById("resetBtn"),
    settingsToggle: document.getElementById("settingsToggle"),
    settingsToggleIcon: document.getElementById("settingsToggleIcon"),
    controlsPanel: document.getElementById("controlsPanel"),
    mobileFiltersBtn: document.getElementById("mobileFiltersBtn"),
    mobileTableCompactBtn: document.getElementById('mobileTableCompactBtn'),
    mobileTableCompactIcon: document.getElementById("mobileTableCompactIcon"),
    panelBackdrop: document.getElementById("panelBackdrop"),
    layout: document.querySelector(".layout"),
    tableWrap: document.querySelector(".table-wrap")
};
