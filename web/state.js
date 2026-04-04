export const state = {
    CONFIG: {},
    players: [],
    selectedPlayers: new Set(),
    allColumns: []
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
    layout: document.querySelector(".layout")
};