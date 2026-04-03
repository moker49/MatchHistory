from flask import Flask, jsonify
from flask_cors import CORS
import json
import logging
import pypyodbc as odbc
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app)

# =========================
# LOGGING
# =========================
with open("config.json", "r", encoding="utf-8") as json_file:
    config = json.load(json_file)

log_formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers.clear()

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
root_logger.addHandler(console_handler)

file_handler = RotatingFileHandler(
    "matchhistory_api.log",
    maxBytes=1_048_576,
    backupCount=1,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)
root_logger.addHandler(file_handler)


# =========================
# CONFIG
# =========================
players_proc = config["procedure_select_players"]
columns_proc = config["procedure_select_columns"]

conn_string = f"""
    DRIVER={{{config['sql_driver']}}};
    SERVER={config['sql_server']};
    DATABASE={config['sql_db']};
    Trust_Connection=yes;
"""

api_host = config.get("api_host", "127.0.0.1")
api_port = int(config.get("api_port", 5001))
api_debug = bool(config.get("api_debug", True))


# =========================
# HELPERS
# =========================
def get_connection():
    return odbc.connect(conn_string)


def fetch_players():
    logging.info("Loading players from procedure: %s", players_proc)

    with get_connection() as con:
        cursor = con.cursor()
        cursor.execute(f"EXEC {players_proc};")
        rows = cursor.fetchall()

        players = []
        for row in rows:
            puuid = str(row[0]) if row[0] is not None else ""
            player = str(row[1]) if row[1] is not None else ""

            if not player:
                continue

            players.append({
                "PUUID": puuid,
                "PLAYER": player
            })

        logging.info("Loaded %s players.", len(players))
        return players
    
def fetch_columns():
    logging.info("Loading columns from procedure: %s", columns_proc)

    with get_connection() as con:
        cursor = con.cursor()
        cursor.execute(f"EXEC {columns_proc};")
        rows = cursor.fetchall()

        columns = []
        for row in rows:
            key = str(row[0]).strip() if row[0] is not None else ""
            label = str(row[1]).strip() if row[1] is not None else ""
            col_type = str(row[2]).strip().lower() if row[2] is not None else ""

            if not key or not label or not col_type:
                continue

            columns.append({
                "key": key,
                "label": label,
                "type": col_type
            })

        logging.info("Loaded %s columns.", len(columns))
        return columns


# =========================
# ROUTES
# =========================
@app.get("/api/players")
def api_players():
    try:
        players = fetch_players()
        return jsonify({
            "ok": True,
            "players": players
        })
    except Exception:
        logging.exception("Failed to load players.")
        return jsonify({
            "ok": False,
            "error": "Failed to load players."
        }), 500

@app.get("/api/columns")
def api_columns():
    try:
        columns = fetch_columns()
        return jsonify({
            "ok": True,
            "columns": columns
        })
    except Exception:
        logging.exception("Failed to load columns.")
        return jsonify({
            "ok": False,
            "error": "Failed to load columns."
        }), 500
    

# =========================
# MAIN
# =========================
if __name__ == "__main__":
    logging.info("Starting API on %s:%s", api_host, api_port)
    app.run(host=api_host, port=api_port, debug=api_debug)