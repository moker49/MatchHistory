from riotwatcher import LolWatcher
import time, json, pypyodbc as odbc


# CONFIG 
config = {}
with open('config.json') as json_file:
    config = json.load(json_file)
interval = config['interval']

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
    cursor = con.cursor()
    print(f'connected: {con}\n')

    for matchId in matchIds:
        print(f'getting match details {matchId} ...')
        currentMatch = lol_watcher.match.by_id(region, matchId)
        print(f'match {matchId} received')
        info = currentMatch['info'];

        for player in info['participants']:

            raw ={
                'win': player['win'],
                'firstBlood': player['firstBloodKill'],
                'firstBloodAssist': player['firstBloodAssist'],
                'firstTower': player['firstTowerKill'],
                'firstTowerAssist': player['firstTowerAssist'],
                'surrender' : player['gameEndedInSurrender'],
                'earlySurrender' : player['gameEndedInEarlySurrender'],
            }

            proccessed = {
                'win': f"{raw['win']}",
                'firstBlood': 'True' if raw['firstBlood'] else 'Assist' if raw['firstBloodAssist'] else 'False',
                'firstTower': 'True' if raw['firstTower'] else 'Assist' if raw['firstTowerAssist'] else 'False',
                'surrender': 'True' if raw['surrender'] else 'Early' if raw['earlySurrender'] else 'False',
            }

            playerMatch = {
                'matchId': matchId,
                'player': player['summonerName'],
                'gameMode': info['gameMode'],
                'champion': player['championName'],
                'date': info['gameStartTimestamp'],
                'durationSec': info['gameDuration'],
                'win': proccessed['win'],
                'kills': player['kills'],
                'deaths': player['deaths'],
                'assists': player['assists'],
                'doubleKills': player['doubleKills'],
                'tripleKills': player['tripleKills'],
                'quadraKills': player['quadraKills'],
                'pentaKills': player['pentaKills'],
                # 'legendaryKills': player['unrealKills'],
                # 'damageToChamps': player['totalDamageDealtToChampions'],
                # 'damageToBuildings': player['damageDealtToBuildings'],
                # 'damageTaken': player['totalDamageTaken'],
                # 'damageMitigated': player['damageSelfMitigated'],
                # 'gold': player['goldEarned'],
                # 'creepScore': player['totalMinionsKilled'],
                # 'dragons': player['dragonKills'],
                # 'barons': player['baronKills'],
                # 'level': player['champLevel'],
                # 'firstBlood': proccessed['firstBlood'],
                # 'firstTower': proccessed['firstTower'],
                # 'surrender': proccessed['surrender'],
                # 'timeCCOthers': player['timeCCingOthers'],
                # 'timeDead': player['totalTimeSpentDead'],
                # 'crit': player['largestCriticalStrike'],
                # 'spell1Cast': player['spell1Casts'],
                # 'spell2Cast': player['spell2Casts'],
                # 'spell3Cast': player['spell3Casts'],
                # 'spell4Cast': player['spell4Casts'],
                # 'summ1Cast': player['summoner1Casts'],
                # 'summ2Cast': player['summoner2Casts'],
                # 'summ1Id': player['summoner1Id'],
                # 'summ2Id': player['summoner2Id'],
                # 'wardsPlaced': player['wardsPlaced'],
                # 'wardsKilled': player['wardsKilled'],
                'puuid': player['puuid'],
            }
            champName = player['championName']
            # print(playerMatch)

            procParamKeys = '@' + ' = ?, @'.join(playerMatch.keys()) + ' = ?'
            procParamValues = tuple([i for i in playerMatch.values()])
            SQL = f'EXEC {insertProc} {procParamKeys};'

            cursor.execute(SQL, procParamValues)
            print(f'inserted: {matchId}/{champName}...')
       
        print(f'waiting: {interval}s...\n')
        time.sleep(interval)
    while cursor.nextset(): pass
    cursor.commit()

print('All inserts done\n')









