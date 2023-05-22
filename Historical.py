from riotwatcher import LolWatcher, ApiError
import time
import json
import pypyodbc as odbc
import pprint
import math


# CONFIG
config = {}
with open('config.json') as json_file:
    config = json.load(json_file)
call_interval = config['call_interval']
# epoch_start = config['epoch_start']
# epoch_insterval = config['epoch_insterval']
pp = pprint.PrettyPrinter(indent=4)
now = time.time()

# LOR WATCHER
api_key = config['riot_api_key']
puuid = config['puuid']
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
ppuidsProc = config['procedure_ppuids']

print(f'connecting to db...')
with odbc.connect(conn_string) as con:
    cursor = con.cursor()
    print(f'connected: {con}\n')
    
    print(f'grabbing player ids (ppuids)\n')
    SQL = f'EXEC {ppuidsProc};'
    cursor.execute(SQL)
    playersDb = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]
    print(f'{len(playersDb)} players ok...\n')

    for playerDb in playersDb:
        player_name = playerDb['player']
        epoch_count = 0

        while (True):
            match_current_count = 0
            match_total_count = (epoch_count*100)+match_current_count

            print('getting matches...')
            matchIds = lol_watcher.match.matchlist_by_puuid(region, puuid, start=match_total_count, count=match_count)
            print('matches received\n')
            print(f'waiting: {call_interval}s...\n')
            time.sleep(call_interval)

            if len(matchIds) == 0:
                print(f'all matches for {player_name} found\n')
                break

            for matchId in matchIds:
                cursor = con.cursor()
                try:
                    currentMatch = lol_watcher.match.by_id(region, matchId)
                except ApiError:
                    print(f'{player_name} epoch:{epoch_count} match:{match_current_count} : {matchId} not found\n')
                    match_current_count += 1
                    continue

                print(f'{player_name} epoch:{epoch_count} match:{match_current_count} : {matchId}')
                info = currentMatch['info']

                for player in info['participants']:

                    raw = {
                        'win': player['win'],
                        'firstBlood': player['firstBloodKill'],
                        'firstBloodAssist': player['firstBloodAssist'],
                        'firstTower': player['firstTowerKill'],
                        'firstTowerAssist': player['firstTowerAssist'],
                        'surrender': player['gameEndedInSurrender'],
                        'earlySurrender': player['gameEndedInEarlySurrender'],
                    }

                    proccessed = {
                        'win': f"{raw['win']}",
                        'firstBlood': 'True' if raw['firstBlood'] else 'Assist' if raw['firstBloodAssist'] else 'False',
                        'firstTower': 'True' if raw['firstTower'] else 'Assist' if raw['firstTowerAssist'] else 'False',
                        'surrender': 'True' if raw['surrender'] else 'Early' if raw['earlySurrender'] else 'False',
                    }

                    playerMatch = {
                    'MATCH_ID': matchId,
                    'PLAYER': player['summonerName'],
                    'GAME_MDOE': info['gameMode'],
                    'CHAMPION': player['championName'],
                    'DATE': info['gameStartTimestamp'],
                    'DURATION': info['gameDuration'],
                    'WIN': proccessed['win'],
                    'KILLS': player['kills'],
                    'DEATHS': player['deaths'],
                    'ASSISTS': player['assists'],
                    'DOUBLE_KILLS': player['doubleKills'],
                    'TRIPLE_KILLS': player['tripleKills'],
                    'QUADRA_KILLS': player['quadraKills'],
                    'PENTA_KILLS': player['pentaKills'],
                    'LEGENDARY_KILLS': player['unrealKills'],
                    'DMG_TO_CHAMPS': player['totalDamageDealtToChampions'],
                    'DMG_TO_STRUCT': player['damageDealtToBuildings'],
                    'DMG_TAKEN': player['totalDamageTaken'],
                    'DMG_MITIGATED': player['damageSelfMitigated'],
                    'GOLD': player['goldEarned'],
                    'CREEP_SCORE': player['totalMinionsKilled'],
                    'DRAGONS': player['dragonKills'],
                    'BARONS': player['baronKills'],
                    'LEVEL': player['champLevel'],
                    'FIRST_BLOOD': proccessed['firstBlood'],
                    'FIRST_TOWER': proccessed['firstTower'],
                    'SURRENDER': proccessed['surrender'],
                    'TIME_CC_OTHER': player['timeCCingOthers'],
                    'TIME_DEAD': player['totalTimeSpentDead'],
                    'CRIT': player['largestCriticalStrike'],
                    'SPELL_1_CAST': player['spell1Casts'],
                    'SPELL_2_CAST': player['spell2Casts'],
                    'SPELL_3_CAST': player['spell3Casts'],
                    'SPELL_4_CAST': player['spell4Casts'],
                    'SUMM_1_CAST': player['summoner1Casts'],
                    'SUMM_2_CAST': player['summoner2Casts'],
                    'SUMM_1_ID': player['summoner1Id'],
                    'SUMM_2_ID': player['summoner2Id'],
                    'WARDS_PLACED': player['wardsPlaced'],
                    'WARDS_KILLED': player['wardsKilled'],
                    'PUUID': player['puuid'],
                }
                    champName = player['championName']
                    # print(playerMatch)

                    procParamKeys = '@' + ' = ?, @'.join(playerMatch.keys()) + ' = ?'
                    procParamValues = tuple([i for i in playerMatch.values()])

                    SQL = f'EXEC {insertProc} {procParamKeys};'
                    cursor.execute(SQL, procParamValues)

                while cursor.nextset(): pass
                cursor.commit()

                print(f'match {matchId} inserted')
                print(f'waiting: {call_interval}s...\n')
                time.sleep(call_interval)
                match_current_count += 1

            epoch_count += 1

print('All inserts done\n')
