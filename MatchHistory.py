from riotwatcher import LolWatcher, ApiError
import time, json, logging
import pypyodbc as odbc
from logging.handlers import RotatingFileHandler
import urllib.request
import urllib.error

# =========================
# CONFIG
# =========================
with open("config.json") as json_file:
    config = json.load(json_file)
with open("keys.json") as json_file:
    keys = json.load(json_file)

cache_invalidate_url = config.get("cache_invalidate_url", "http://127.0.0.1:5001/api/cache/invalidate")
cache_warm_url = config.get("cache_warm_url", "http://127.0.0.1:5001/api/cache/warm")
internal_api_token = keys.get("internal_api_token")

call_interval = config.get("call_interval", 1.2)
api_key = keys["riot_api_key"]
region = config["region"]
match_count = 100
epoch_stop = config.get("epoch_stop", 50)

dry_run = config.get("dry_run", 0)
dry_run_player = config.get("dry_run_player", 'erik')
log_level = config.get("log_level", "info")

insert_proc = config["procedure_insert"]
ghost_insert_proc = config["procedure_insert_ghost"]
puuids_proc = config["procedure_puuids"]
select_all_for_player_proc = config["procedure_select_all_for_player"]
missing_game_modes_proc = config["procedure_select_missing_game_modes"]

max_api_retries = config.get("max_api_retries", 5)

lol_watcher = LolWatcher(api_key)

conn_string = f"""
    DRIVER={{{config['sql_driver']}}};
    SERVER={config['sql_server']};
    DATABASE={config['sql_db']};
    UID={keys["db_user"]};
    PWD={keys["db_password"]};
"""

# =========================
# LOGGING
# =========================
log_formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(message)s"
)

root_logger = logging.getLogger()
if (log_level == "debug"):
    root_logger.setLevel(logging.DEBUG)
elif (log_level == "warning"):
    root_logger.setLevel(logging.WARNING)
elif (log_level == "error"):
    root_logger.setLevel(logging.ERROR)
elif (log_level == "critical"):
    root_logger.setLevel(logging.CRITICAL)
else:
    root_logger.setLevel(logging.INFO)

# Clear default handlers in case script is re-run in same interpreter
root_logger.handlers.clear()

# Console handler
console_handler = logging.StreamHandler()
console_handler.setFormatter(log_formatter)
root_logger.addHandler(console_handler)

# Rotating file handler
file_handler = RotatingFileHandler(
    "logs/matchhistory.log",
    maxBytes=1_048_576,
    backupCount=3,
    encoding="utf-8"
)
file_handler.setFormatter(log_formatter)
root_logger.addHandler(file_handler)


# =========================
# HELPERS
# =========================
def build_internal_headers():
    headers = {"Content-Type": "application/json"}

    if internal_api_token:
        headers["X-Internal-Token"] = internal_api_token

    return headers

def sleep_with_log(seconds: float, reason: str = "") -> None:
    if reason:
        logging.debug("Waiting %.2fs (%s)", seconds, reason)
    else:
        logging.debug("Waiting %.2fs", seconds)
    time.sleep(seconds)


def invalidate_cache():
    try:
        req = urllib.request.Request(
            cache_invalidate_url,
            data=b"{}",
            headers=build_internal_headers(),
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode("utf-8", errors="replace").strip()
            logging.info("Search cache invalidated. Response: %s", body)

    except Exception:
        logging.exception("Failed to invalidate search cache.")


def warm_cache():
    try:
        req = urllib.request.Request(
            cache_warm_url,
            data=b"{}",
            headers=build_internal_headers(),
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8", errors="replace").strip()
            logging.info("Cache warmed. Response: %s", body[:500])

    except Exception:
        logging.exception("Failed to warm cache.")


def riot_api_call(func, *args, **kwargs):
    """
    Wrapper for Riot API calls with retry handling.
    - Handles 429 with Retry-After if available
    - Retries transient failures up to max_api_retries
    """
    last_exc = None

    for attempt in range(1, max_api_retries + 1):
        try:
            result = func(*args, **kwargs)
            sleep_with_log(call_interval, "rate-limit spacing")
            return result

        except ApiError as e:
            last_exc = e

            status_code = getattr(getattr(e, "response", None), "status_code", None)
            headers = getattr(getattr(e, "response", None), "headers", {}) or {}

            if status_code == 429:
                retry_after = headers.get("Retry-After")
                wait_seconds = float(retry_after) if retry_after else max(call_interval, 1.0)
                logging.warning(
                    "Riot API rate limited (429). Attempt %s/%s. Sleeping %.2fs.",
                    attempt, max_api_retries, wait_seconds
                )
                time.sleep(wait_seconds)
                continue

            if status_code in (500, 502, 503, 504):
                wait_seconds = max(call_interval, attempt * 2)
                logging.warning(
                    "Riot API transient error %s. Attempt %s/%s. Sleeping %.2fs.",
                    status_code, attempt, max_api_retries, wait_seconds
                )
                time.sleep(wait_seconds)
                continue

            logging.error("Riot API non-retryable error: %s", e)
            raise

        except Exception as e:
            last_exc = e

            wait_seconds = max(call_interval, attempt * 2)
            logging.exception(
                "Unexpected error during Riot API call. Attempt %s/%s. Sleeping %.2fs.",
                attempt, max_api_retries, wait_seconds
            )
            time.sleep(wait_seconds)

    raise RuntimeError(
        f"Riot API call failed after {max_api_retries} attempts."
    ) from last_exc


def log_db_connection(cursor):
    try:
        cursor.execute("""
            SELECT
                @@SERVERNAME AS server_name,
                DB_NAME() AS database_name,
                SUSER_SNAME() AS login_name,
                USER_NAME() AS database_user;
        """)
        row = cursor.fetchone()

        logging.warning(
            "DB connection | server=%s | database=%s | login=%s | user=%s",
            row[0], row[1], row[2], row[3]
        )
        logging.warning(
            "DB procedures | insert=%s | ghost_insert=%s | select_existing=%s",
            insert_proc, ghost_insert_proc, select_all_for_player_proc
        )
    except Exception:
        logging.exception("Failed to log DB connection context.")


def get_players(cursor):
    logging.info("Grabbing player ids (puuids)...")
    cursor.execute(f"EXEC {puuids_proc};")
    players = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]
    logging.info("%s players loaded.", len(players))
    return players


def get_existing_match_ids_for_player(cursor, player_puuid):
    """
    Expects a proc like:
        EXEC dbo.YourProc @PUUID = ?
    returning rows containing MATCH_ID
    """
    sql = f"EXEC {select_all_for_player_proc} @PUUID = ?;"
    cursor.execute(sql, (player_puuid,))
    rows = cursor.fetchall()

    existing_ids = set()

    col_names = []
    if cursor.description:
        col_names = [col[0].upper() for col in cursor.description]
    for row in rows:
        if "MATCH_ID" in col_names:
            idx = col_names.index("MATCH_ID")
            existing_ids.add(str(row[idx]))
        elif len(row) > 0:
            existing_ids.add(str(row[0]))

    logging.info("Loaded %s existing match ids for player puuid=%s", len(existing_ids), player_puuid)
    return existing_ids


def build_processed_flags(player):
    raw = {
        "win": player.get("win"),
        "firstBlood": player.get("firstBloodKill"),
        "firstBloodAssist": player.get("firstBloodAssist"),
        "firstTower": player.get("firstTowerKill"),
        "firstTowerAssist": player.get("firstTowerAssist"),
        "surrender": player.get("gameEndedInSurrender"),
        "earlySurrender": player.get("gameEndedInEarlySurrender"),
    }

    win = raw.get("win")
    processed = {
        "win": f"{win}",
        "firstBlood": "True" if raw.get("firstBlood") else "Assist" if raw.get("firstBloodAssist") else "False",
        "firstTower": "True" if raw.get("firstTower") else "Assist" if raw.get("firstTowerAssist") else "False",
        "surrender": "True" if raw.get("surrender") else "Early" if raw.get("earlySurrender") else "False",
    }
    return processed


def build_player_match(match_id, info, player):
    processed = build_processed_flags(player)

    return {
        "MATCH_ID": match_id,
        "PLAYER": player.get("summonerName") or player.get("riotIdGameName"),
        "GAME_MODE": info.get("gameMode"),
        "CHAMPION": player.get("championName"),
        "DATE": info.get("gameStartTimestamp"),
        "DURATION": info.get("gameDuration"),
        "WIN": processed.get("win"),
        "KILLS": player.get("kills"),
        "DEATHS": player.get("deaths"),
        "ASSISTS": player.get("assists"),
        "DOUBLE_KILLS": player.get("doubleKills"),
        "TRIPLE_KILLS": player.get("tripleKills"),
        "QUADRA_KILLS": player.get("quadraKills"),
        "PENTA_KILLS": player.get("pentaKills"),
        "LEGENDARY_KILLS": player.get("unrealKills"),
        "DMG_TO_CHAMPS": player.get("totalDamageDealtToChampions"),
        "DMG_TO_STRUCT": player.get("damageDealtToBuildings"),
        "DMG_TAKEN": player.get("totalDamageTaken"),
        "DMG_MITIGATED": player.get("damageSelfMitigated"),
        "GOLD": player.get("goldEarned"),
        "CREEP_SCORE": player.get("totalMinionsKilled"),
        "DRAGONS": player.get("dragonKills"),
        "BARONS": player.get("baronKills"),
        "LEVEL": player.get("champLevel"),
        "FIRST_BLOOD": processed.get("firstBlood"),
        "FIRST_TOWER": processed.get("firstTower"),
        "SURRENDER": processed.get("surrender"),
        "TIME_CC_OTHER": player.get("timeCCingOthers"),
        "TIME_DEAD": player.get("totalTimeSpentDead"),
        "CRIT": player.get("largestCriticalStrike"),
        "SPELL_1_CAST": player.get("spell1Casts"),
        "SPELL_2_CAST": player.get("spell2Casts"),
        "SPELL_3_CAST": player.get("spell3Casts"),
        "SPELL_4_CAST": player.get("spell4Casts"),
        "SUMM_1_CAST": player.get("summoner1Casts"),
        "SUMM_2_CAST": player.get("summoner2Casts"),
        "SUMM_1_ID": player.get("summoner1Id"),
        "SUMM_2_ID": player.get("summoner2Id"),
        "WARDS_PLACED": player.get("wardsPlaced"),
        "WARDS_KILLED": player.get("wardsKilled"),
        "PUUID": player.get("puuid"),
    }


def insert_match_participants(cursor, match_id, current_match):
    info = current_match["info"]

    for player in info["participants"]:
        player_match = build_player_match(match_id, info, player)
        proc_param_keys = "@" + " = ?, @".join(player_match.keys()) + " = ?"
        proc_param_values = tuple(player_match.values())

        sql = f"EXEC {insert_proc} {proc_param_keys};"
        cursor.execute(sql, proc_param_values)


def insert_ghost_match(cursor, match_id, player_puuid):
    """
    Separate proc for ghost insert.
    Expected proc signature example:
        EXEC dbo.proc_insert_ghost_match @MATCH_ID = ?, @PUUID = ?;
    """
    sql = f"EXEC {ghost_insert_proc} @MATCH_ID = ?, @PUUID = ?;"
    cursor.execute(sql, (match_id, player_puuid))


def ghost_match_exists(cursor, match_id, player_puuid):
    cursor.execute("""
        SELECT COUNT(*)
        FROM dbo.[MATCH]
        WHERE MATCH_ID = ?
          AND PUUID = ?
          AND (
              GAME_MODE IS NULL
              OR CHAMPION IS NULL
          );
    """, (match_id, player_puuid))

    return cursor.fetchone()[0] > 0

def get_game_modes_missing_participant_count(cursor):
    sql = f"EXEC {missing_game_modes_proc};"
    cursor.execute(sql)
    rows = cursor.fetchall()

    missing_modes = []
    if cursor.description:
        col_names = [col[0].upper() for col in cursor.description]
        if "GAME_MODE" in col_names:
            idx = col_names.index("GAME_MODE")
            missing_modes = [str(row[idx]) for row in rows if row[idx] is not None]
        elif rows and len(rows[0]) > 0:
            missing_modes = [str(row[0]) for row in rows if row[0] is not None]

    return missing_modes

def process_player(con, cursor, player_db):
    player_name = player_db["player"]
    player_puuid = player_db["puuid"]
    matches_found = False

    logging.info("Processing player: %s", player_name)

    # Dry run support: if dry_run is enabled, only process the configured dry_run_player
    # and only run the first epoch. In dry run we do not perform any DB inserts or commits,
    # but we still call the Riot API to demonstrate what would be done.
    is_dry_run = bool(dry_run) and (player_name.lower() == dry_run_player.lower())
    if dry_run and not is_dry_run:
        logging.info("Dry run mode enabled. Skipping player %s (only running for %s).", player_name, dry_run_player)
        return False

    player_has_new_data = False
    existing_match_ids = get_existing_match_ids_for_player(cursor, player_puuid)

    # If dry run for this player, only run a single epoch
    max_epochs = 1 if is_dry_run else epoch_stop

    for epoch_count in range(max_epochs):
        match_total_count = epoch_count * match_count
        logging.info(
            "%s | epoch=%s | requesting matchlist start=%s count=%s",
            player_name, epoch_count, match_total_count, match_count
        )

        try:
            match_ids = riot_api_call(
                lol_watcher.match.matchlist_by_puuid,
                region,
                player_puuid,
                start=match_total_count,
                count=match_count
            )
            logging.debug("loaded matchlist = %s", match_ids)
        except Exception:
            logging.exception(
                "%s | epoch=%s | unable to retrieve match list; skipping epoch",
                player_name, epoch_count
            )
            continue

        if not match_ids:
            logging.info("All matches for %s found. No more ids returned.", player_name)
            break

        epoch_insert_count = 0
        epoch_skip_count = 0
        epoch_ghost_count = 0

        for match_index, match_id in enumerate(match_ids):
            match_id = str(match_id)

            if match_id in existing_match_ids:
                matches_found = True
                epoch_skip_count += 1
                logging.debug(
                    "%s | epoch=%s | match=%s | already exists locally, skipping",
                    player_name, epoch_count, match_id
                )
                continue

            logging.info(
                "%s | epoch=%s | match_idx=%s | match_id=%s",
                player_name, epoch_count, match_index, match_id
            )

            try:
                current_match = riot_api_call(lol_watcher.match.by_id, region, match_id)
            except Exception:
                logging.exception(
                    "%s | epoch=%s | match_id=%s | failed to retrieve details, inserting ghost row",
                    player_name, epoch_count, match_id
                )
                try:
                    if is_dry_run:
                        logging.debug("%s | epoch=%s | match_id=%s | dry run - would insert ghost row", player_name, epoch_count, match_id)
                    else:
                        if ghost_match_exists(cursor, match_id, player_puuid):
                            logging.info(
                                "%s | epoch=%s | match_id=%s | ghost row already exists; skipping ghost insert",
                                player_name, epoch_count, match_id
                            )
                            epoch_skip_count += 1
                        else:
                            insert_ghost_match(cursor, match_id, player_puuid)
                            con.commit()
                            player_has_new_data = True
                            epoch_ghost_count += 1
                            logging.info("%s | epoch=%s | match_id=%s | committed ghost row", player_name, epoch_count, match_id)
                    existing_match_ids.add(match_id)
                except Exception:
                    logging.exception(
                        "%s | epoch=%s | match_id=%s | ghost insert or commit failed",
                        player_name, epoch_count, match_id
                    )
                    if not is_dry_run:
                        con.rollback()
                        existing_match_ids = get_existing_match_ids_for_player(cursor, player_puuid)
                        logging.warning("%s | epoch=%s | match_id=%s | rollback completed", player_name, epoch_count, match_id)
                continue

            info = current_match.get("info", {}) if isinstance(current_match, dict) else {}
            participants = info.get("participants") or []

            if not participants:
                logging.warning(
                    "%s | epoch=%s | match_id=%s | no participants returned; inserting ghost row",
                    player_name, epoch_count, match_id
                )
                try:
                    if is_dry_run:
                        logging.debug(
                            "%s | epoch=%s | match_id=%s | dry run - would insert ghost row for empty participants",
                            player_name, epoch_count, match_id
                        )
                    else:
                        if ghost_match_exists(cursor, match_id, player_puuid):
                            logging.info(
                                "%s | epoch=%s | match_id=%s | ghost row already exists for empty participants; skipping ghost insert",
                                player_name, epoch_count, match_id
                            )
                            epoch_skip_count += 1
                        else:
                            insert_ghost_match(cursor, match_id, player_puuid)
                            con.commit()
                            player_has_new_data = True
                            epoch_ghost_count += 1
                            logging.info(
                                "%s | epoch=%s | match_id=%s | committed ghost row for empty participants",
                                player_name, epoch_count, match_id
                            )
                    existing_match_ids.add(match_id)
                except Exception:
                    logging.exception(
                        "%s | epoch=%s | match_id=%s | ghost insert or commit failed for empty participants",
                        player_name, epoch_count, match_id
                    )
                    if not is_dry_run:
                        con.rollback()
                        existing_match_ids = get_existing_match_ids_for_player(cursor, player_puuid)
                        logging.warning("%s | epoch=%s | match_id=%s | rollback completed", player_name, epoch_count, match_id)
                continue

            try:
                if is_dry_run:
                    logging.info("%s | epoch=%s | match_id=%s | dry run - would insert match participants", player_name, epoch_count, match_id)
                else:
                    insert_match_participants(cursor, match_id, current_match)
                    con.commit()
                    player_has_new_data = True
                    logging.info("%s | epoch=%s | match_id=%s | committed match participants", player_name, epoch_count, match_id)
                epoch_insert_count += 1
                existing_match_ids.add(match_id)
            except Exception:
                logging.exception(
                    "%s | epoch=%s | match_id=%s | DB insert or commit failed",
                    player_name, epoch_count, match_id
                )
                if not is_dry_run:
                    con.rollback()
                    existing_match_ids = get_existing_match_ids_for_player(cursor, player_puuid)
                    logging.warning("%s | epoch=%s | match_id=%s | rollback completed", player_name, epoch_count, match_id)

        if is_dry_run:
            logging.info(
                "%s | dry run | epoch=%s would commit per match | inserted=%s | ghost=%s | skipped=%s",
                player_name, epoch_count, epoch_insert_count, epoch_ghost_count, epoch_skip_count
            )
        else:
            logging.info(
                "%s | epoch=%s complete | committed_per_match_inserted=%s | committed_per_match_ghost=%s | skipped=%s",
                player_name, epoch_count, epoch_insert_count, epoch_ghost_count, epoch_skip_count
            )

    if matches_found:
        logging.info("Some duplicate matches for %s were skipped.", player_name)

    return player_has_new_data


# =========================
# MAIN
# =========================
def main():
    logging.info("Connecting to DB...")

    with odbc.connect(conn_string) as con:
        cursor = con.cursor()
        logging.info("Connected to DB.")
        log_db_connection(cursor)
        players_db = get_players(cursor)
        any_new_data = False

        for player_db in players_db:
            try:
                player_had_new_data = process_player(con, cursor, player_db)
                any_new_data = any_new_data or bool(player_had_new_data)
            except Exception:
                logging.exception(
                    "Fatal error while processing player %s",
                    player_db.get("player")
                )

        missing_modes = get_game_modes_missing_participant_count(cursor)
        if missing_modes:
            logging.warning(
                "Game modes missing participant count: %s",
                ", ".join(missing_modes)
            )
        else:
            logging.info("All active game modes have participant counts defined.")

    logging.info("All inserts done.")

    if any_new_data:
        invalidate_cache()
        warm_cache()
    else:
        logging.info("No new match data committed; cache refresh skipped.")

def run_forever():
    loop_interval_minutes = config.get("loop_interval_minutes", 15)

    while True:
        start_time = time.time()
        try:
            main()
        except Exception:
            logging.exception("Fatal error in main loop")

        elapsed = time.time() - start_time

        logging.info(
            "===== RUN COMPLETE (%.2fs). Sleeping %.2fs =====",
            elapsed,
            loop_interval_minutes * 60
        )

        try:
            time.sleep(loop_interval_minutes * 60)
        except KeyboardInterrupt:
            logging.info("Shutdown requested. Exiting loop.")
            break


if __name__ == "__main__":
    run_forever()