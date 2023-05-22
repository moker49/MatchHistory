from riotwatcher import LolWatcher
import time, json, pypyodbc as odbc

# CONFIG 
config = {}
with open('config.json') as json_file:
    config = json.load(json_file)
call_interval = config['call_interval']

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


print('getting matches...')
matchIds = lol_watcher.match.matchlist_by_puuid(region, puuid, count=match_count)
print('matches received\n')

print(f'connecting to db...')
with odbc.connect(conn_string) as con:
    print(f'connected: {con}\n')

    for matchId in matchIds:
        cursor = con.cursor()

        print(f'getting match details {matchId} ...')
        currentMatch = lol_watcher.match.by_id(region, matchId)
        print(f'match {matchId} received')
        info = currentMatch['info']

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
                'PLAYER': player.get("summonerName"),
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
            playerName = player['summonerName']
            # print(playerMatch)

            procParamKeys = '@' + ' = ?, @'.join(playerMatch.keys()) + ' = ?'
            procParamValues = tuple([i for i in playerMatch.values()])
            SQL = f'EXEC {insertProc} {procParamKeys};'

            cursor.execute(SQL, procParamValues)

        while cursor.nextset(): pass
        cursor.commit()
        print(f'inserted: {matchId}...')
            
        print(f'waiting: {call_interval}s...\n')
        time.sleep(call_interval)


print('All inserts done\n')









