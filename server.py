from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import logging
import pypyodbc as odbc
from logging.handlers import RotatingFileHandler
import time

RATE_LIMIT_WINDOW_SECONDS = 2.0
_last_request_by_ip = {}
app = Flask(__name__)
CORS(app)

# =========================
# CONFIG
# =========================
with open("config.json", "r", encoding="utf-8") as json_file:
    config = json.load(json_file)
with open("keys.json") as json_file:
    keys = json.load(json_file)

players_proc = config["procedure_select_players"]
columns_proc = config["procedure_select_columns"]
options_proc = config["procedure_list_options"]
search_matches_proc = config["procedure_search_matches"]

conn_string = f"""
    DRIVER={{{config['sql_driver']}}};
    SERVER={config['sql_server']};
    DATABASE={config['sql_db']};
    UID={keys["db_user"]};
    PWD={keys["db_password"]};
"""

api_host = config.get("api_host", "127.0.0.1")
api_port = int(config.get("api_port", 5001))
api_debug = bool(config.get("api_debug", False))


# =========================
# LOGGING
# =========================
log_formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.handlers.clear()

console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
root_logger.addHandler(console_handler)

file_handler = RotatingFileHandler(
    "server.log",
    maxBytes=1_048_576,
    backupCount=1,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)
root_logger.addHandler(file_handler)


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


def fetch_column_options():
    logging.info("Loading column options from procedure: %s", options_proc)

    with get_connection() as con:
        cursor = con.cursor()
        cursor.execute(f"EXEC {options_proc};")
        rows = cursor.fetchall()

        grouped_options = {}

        for row in rows:
            list_name = str(row[0]).strip() if row[0] is not None else ""
            list_item = str(row[1]).strip() if row[1] is not None else ""
            label = str(row[2]).strip() if row[2] is not None else list_item

            if not list_name or not list_item:
                continue

            if list_name not in grouped_options:
                grouped_options[list_name] = []

            grouped_options[list_name].append({
                "value": list_item,
                "label": label
            })

        logging.info("Loaded options for %s list(s).", len(grouped_options))
        return grouped_options


def parse_match_search_request(payload):
    payload = payload or {}

    players = payload.get("players", [])
    visible_columns = payload.get("visible_columns", [])
    filter_mode = str(payload.get("filter_mode", "all")).lower()
    filters = payload.get("filters", [])
    sort_key = payload.get("sort_key")
    sort_direction = str(payload.get("sort_direction", "desc")).lower()

    try:
        page = int(payload.get("page", 1))
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(payload.get("page_size", 100))
    except (TypeError, ValueError):
        page_size = 100

    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 1
    elif page_size > 500:
        page_size = 500

    if filter_mode not in ("all", "any"):
        filter_mode = "all"

    if not isinstance(players, list):
        players = []

    if not isinstance(visible_columns, list):
        visible_columns = []

    if not isinstance(filters, list):
        filters = []

    players = [str(x).strip() for x in players if str(x).strip()]
    visible_columns = [str(x).strip() for x in visible_columns if str(x).strip()]

    if sort_direction not in ("asc", "desc"):
        sort_direction = "desc"

    if sort_key is not None:
        sort_key = str(sort_key).strip().upper()
        if not sort_key:
            sort_key = None

    return {
        "players": players,
        "visible_columns": visible_columns,
        "filter_mode": filter_mode,
        "filters": filters,
        "page": page,
        "page_size": page_size,
        "sort_key": sort_key,
        "sort_direction": sort_direction if sort_key else None
    }


def row_to_dict(columns, row):
    result = {}

    for index, column_name in enumerate(columns):
        value = row[index]

        # jsonify can handle None/int/float/bool/str fine.
        # Convert anything else to string as a safe fallback.
        if isinstance(value, (str, int, float, bool)) or value is None:
            result[column_name] = value
        else:
            result[column_name] = str(value)

    return result


def search_matches(search_request):
    logging.info(
        "Searching matches | page=%s | page_size=%s | players=%s | visible_columns=%s | filters=%s | filter_mode=%s | sort=%s %s",
        search_request["page"],
        search_request["page_size"],
        len(search_request["players"]),
        len(search_request["visible_columns"]),
        len(search_request["filters"]),
        search_request["filter_mode"],
        search_request.get("sort_key"),
        search_request.get("sort_direction")
    )

    search_json = json.dumps(search_request, ensure_ascii=False)

    with get_connection() as con:
        cursor = con.cursor()

        cursor.execute(f"""
            EXEC {search_matches_proc}
                @search_json = ?
        """, (search_json,))

        # First result set: page rows
        rows = cursor.fetchall()
        row_columns = [col[0] for col in cursor.description] if cursor.description else []
        result_rows = []
        for row in rows:
            result_row = {}
            for i, col in enumerate(row_columns):
                value = row[i]
                result_row[str(col).upper()] = value
            result_rows.append(result_row)

        # Second result set: total_count
        total_count = 0
        if cursor.nextset():
            total_row = cursor.fetchone()
            if total_row and total_row[0] is not None:
                total_count = int(total_row[0])

    total_pages = 0
    if total_count > 0:
        total_pages = (total_count + search_request["page_size"] - 1) // search_request["page_size"]

    logging.info(
        "Match search complete | returned_rows=%s | total_count=%s | total_pages=%s",
        len(result_rows),
        total_count,
        total_pages
    )

    return {
        "rows": result_rows,
        "total_count": total_count,
        "page": search_request["page"],
        "page_size": search_request["page_size"],
        "total_pages": total_pages
    }

def wait_for_rate_limit(key: str, window_seconds: float = RATE_LIMIT_WINDOW_SECONDS):
    now = time.time()
    last_seen = _last_request_by_ip.get(key)

    if last_seen is not None:
        elapsed = now - last_seen
        remaining = window_seconds - elapsed

        if remaining > 0:
            logging.info("Rate limit hit for %s. Sleeping %.2fs", key, remaining)
            time.sleep(remaining)

    _last_request_by_ip[key] = time.time()


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


@app.get("/api/column-options")
def api_column_options():
    try:
        options = fetch_column_options()
        return jsonify({
            "ok": True,
            "options": options
        })
    except Exception:
        logging.exception("Failed to load column options.")
        return jsonify({
            "ok": False,
            "error": "Failed to load column options."
        }), 500


@app.post("/api/matches/search")
def api_matches_search():
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    rate_key = f"matches_search:{client_ip}"
                
    wait_for_rate_limit(rate_key, window_seconds=2.0)

    try:
        payload = request.get_json(silent=True) or {}
        search_request = parse_match_search_request(payload)
        result = search_matches(search_request)

        return jsonify({
            "ok": True,
            "rows": result["rows"],
            "total_count": result["total_count"],
            "page": result["page"],
            "page_size": result["page_size"],
            "total_pages": result["total_pages"]
        })
    except Exception:
        logging.exception("Failed to search matches.")
        return jsonify({
            "ok": False,
            "error": "Failed to search matches."
        }), 500


# =========================
# MAIN
# =========================
if __name__ == "__main__":
    logging.info("Starting API on %s:%s", api_host, api_port)
    app.run(host=api_host, port=api_port, debug=api_debug)