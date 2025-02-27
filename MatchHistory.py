from riotwatcher import LolWatcher, ApiError
from datetime import datetime
import time
import json
import pypyodbc as odbc
import pprint


# CONFIG
config = {}
with open('config.json') as json_file:
    config = json.load(json_file)
call_interval = 1.2  #config['call_interval']
pp = pprint.PrettyPrinter(indent=4)
now = time.time()

# LOR WATCHER
api_key = config['riot_api_key']
region = config['region']
match_count = config['match_count']
lol_watcher = LolWatcher(api_key)

# SQL
conn_string = f"""
    DRIVER={{{config['sql_driver']}}};
    SERVER={config['sql_server']};
    DATABASE={config['sql_db']};
    Trust_Connection=yes;
"""
insertProc = config['procedure_insert']
puuidsProc = config['procedure_puuids']
selectProc = config['procedure_select_match']
firstRun = True

print(f'connecting to db...')
with odbc.connect(conn_string) as con:
    cursor = con.cursor()
    print(f'connected: {con}\n')
    
    # GET MY FAV PLAYERS
    print(f'grabbing player ids (puuids)\n')
    SQL = f'EXEC {puuidsProc};'
    cursor.execute(SQL)
    playersDb = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]
    print(f'{len(playersDb)} players ok...')
    duration = float(len(playersDb) * match_count * call_interval)
    print(f'maximum expected duration: {duration}sec ({duration/60}min)\n')

    for playerDb in playersDb:
        player_name = playerDb['player']
        player_puuid = playerDb['puuid']
        epoch_count = 0
        epoch_stop = config['epoch_stop']
        if firstRun: epoch_count = config['epoch_start']
        matches_found = False

        while (epoch_count < epoch_stop):
            match_current_count = 0
            if firstRun: match_current_count = config['match_start']
            firstRun = False
            match_total_count = (epoch_count*100)+match_current_count

            # API CALL
            try:
                matchIds = lol_watcher.match.matchlist_by_puuid(region, player_puuid, start=match_total_count, count=match_count)
            except ApiError:
                print(f'{player_name} epoch:{epoch_count} error\n')
                time.sleep(call_interval)
                continue

            print('matches received\n')
            print(f'waiting: {call_interval}s...\n')
            time.sleep(call_interval)

            # ALL MATCHES FOUND
            if len(matchIds) == 0:
                print(f'all matches for {player_name} found\n')
                break

            for matchId in matchIds:
                cursor = con.cursor()

                # IF MATCH LOCALLY FOUND, SKIP
                SQL = f'EXEC {selectProc} {matchId};'
                cursor.execute(SQL)
                if (len(cursor.fetchall()) > 0):
                    matches_found = True
                    match_current_count += 1
                    continue

                # INSERT GHOST MATCH IF ITS DETAILS ARE NOT FOUND
                try:
                    currentMatch = lol_watcher.match.by_id(region, matchId)
                except ApiError:
                    print(f'{player_name} epoch:{epoch_count} match:{match_current_count} : {matchId}')
                    SQL = f'EXEC {insertProc} @MATCH_ID = ?, @PLAYER = ?, @GAME_MODE = ?, @CHAMPION = ?, @DATE = ?, @DURATION = ?, @WIN = ?, @KILLS = ?, @DEATHS = ?, @ASSISTS = ?, @DOUBLE_KILLS = ?, @TRIPLE_KILLS = ?, @QUADRA_KILLS = ?, @PENTA_KILLS = ?, @LEGENDARY_KILLS = ?, @DMG_TO_CHAMPS = ?, @DMG_TO_STRUCT = ?, @DMG_TAKEN = ?, @DMG_MITIGATED = ?, @GOLD = ?, @CREEP_SCORE = ?, @DRAGONS = ?, @BARONS = ?, @LEVEL = ?, @FIRST_BLOOD = ?, @FIRST_TOWER = ?, @SURRENDER = ?, @TIME_CC_OTHER = ?, @TIME_DEAD = ?, @CRIT = ?, @SPELL_1_CAST = ?, @SPELL_2_CAST = ?, @SPELL_3_CAST = ?, @SPELL_4_CAST = ?, @SUMM_1_CAST = ?, @SUMM_2_CAST = ?, @SUMM_1_ID = ?, @SUMM_2_ID = ?, @WARDS_PLACED = ?, @WARDS_KILLED = ?,@PUUID = ?;'
                    values = (matchId, *([None] * 39), playerDb['puuid'])
                    cursor.execute(SQL, values)
                    print(f'match {matchId} inserted blank')
                    print(f'waiting: {call_interval}s...\n')
                    match_current_count += 1
                    time.sleep(call_interval)
                    continue

                print(f'{player_name} epoch:{epoch_count} match:{match_current_count} : {matchId}')
                info = currentMatch['info']

                # BUILD ROW WITH DATA FROM API CALL
                for player in info['participants']:

                    raw = {
                        'win': player.get("win"),
                        'firstBlood': player.get("firstBloodKill"),
                        'firstBloodAssist': player.get("firstBloodAssist"),
                        'firstTower': player.get("firstTowerKill"),
                        'firstTowerAssist': player.get("firstTowerAssist"),
                        'surrender': player.get("gameEndedInSurrender"),
                        'earlySurrender': player.get("gameEndedInEarlySurrender")
                    }

                    win = raw.get("win")
                    proccessed = {
                    'win': f"{win}",
                    'firstBlood': 'True' if raw.get("firstBlood") else 'Assist' if raw.get("firstBloodAssist") else 'False',
                    'firstTower': 'True' if raw.get("firstTower") else 'Assist' if raw.get("firstTowerAssist") else 'False',
                    'surrender': 'True' if raw.get("surrender") else 'Early' if raw.get("earlySurrender") else 'False',
                    }

                    playerMatch = {
                    'MATCH_ID': matchId,
                    'PLAYER': player.get("summonerName") or player.get("riotIdGameName"),
                    'GAME_MODE': info.get("gameMode"),
                    'CHAMPION': player.get("championName"),
                    'DATE': info.get("gameStartTimestamp"),
                    'DURATION': info.get("gameDuration"),
                    'WIN': proccessed.get("win"),
                    'KILLS': player.get("kills"),
                    'DEATHS': player.get("deaths"),
                    'ASSISTS': player.get("assists"),
                    'DOUBLE_KILLS': player.get("doubleKills"),
                    'TRIPLE_KILLS': player.get("tripleKills"),
                    'QUADRA_KILLS': player.get("quadraKills"),
                    'PENTA_KILLS': player.get("pentaKills"),
                    'LEGENDARY_KILLS': player.get("unrealKills"),
                    'DMG_TO_CHAMPS': player.get("totalDamageDealtToChampions"),
                    'DMG_TO_STRUCT': player.get("damageDealtToBuildings"),
                    'DMG_TAKEN': player.get("totalDamageTaken"),
                    'DMG_MITIGATED': player.get("damageSelfMitigated"),
                    'GOLD': player.get("goldEarned"),
                    'CREEP_SCORE': player.get("totalMinionsKilled"),
                    'DRAGONS': player.get("dragonKills"),
                    'BARONS': player.get("baronKills"),
                    'LEVEL': player.get("champLevel"),
                    'FIRST_BLOOD': proccessed.get("firstBlood"),
                    'FIRST_TOWER': proccessed.get("firstTower"),
                    'SURRENDER': proccessed.get("surrender"),
                    'TIME_CC_OTHER': player.get("timeCCingOthers"),
                    'TIME_DEAD': player.get("totalTimeSpentDead"),
                    'CRIT': player.get("largestCriticalStrike"),
                    'SPELL_1_CAST': player.get("spell1Casts"),
                    'SPELL_2_CAST': player.get("spell2Casts"),
                    'SPELL_3_CAST': player.get("spell3Casts"),
                    'SPELL_4_CAST': player.get("spell4Casts"),
                    'SUMM_1_CAST': player.get("summoner1Casts"),
                    'SUMM_2_CAST': player.get("summoner2Casts"),
                    'SUMM_1_ID': player.get("summoner1Id"),
                    'SUMM_2_ID': player.get("summoner2Id"),
                    'WARDS_PLACED': player.get("wardsPlaced"),
                    'WARDS_KILLED': player.get("wardsKilled"),
                    'PUUID': player.get("puuid")
                }

                    procParamKeys = '@' + ' = ?, @'.join(playerMatch.keys()) + ' = ?'
                    procParamValues = tuple([i for i in playerMatch.values()])

                    # INSERT ROW
                    SQL = f'EXEC {insertProc} {procParamKeys};'
                    cursor.execute(SQL, procParamValues)

                # COMMIT ALL INSERTS (ALL PLAYERS FROM CURRENT MATCH)
                while cursor.nextset(): pass
                cursor.commit()

                print(f'match {matchId} inserted')
                print(f'waiting: {call_interval}s...\n')
                match_current_count += 1
                time.sleep(call_interval)

            epoch_count += 1
        
        # PLAYER MATCHES WERE FOUND
        if (matches_found):
            print(f'Some duplicate matches for {player_name} were skipped.\n')

print('All inserts done\n')
print(datetime.now())