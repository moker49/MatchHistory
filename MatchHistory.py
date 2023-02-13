@@ -0,0 +1,85 @@
from riotwatcher import LolWatcher, ApiError
import json, pypyodbc as odbc


# CONFIG 
config = {}
conn_string = ''
with open('config.json') as json_file:
    config = json.load(json_file)

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
        lastMatch = lol_watcher.match.by_id(region, matchId)

        my_index = lastMatch['metadata']['participants'].index(puuid)
        metadata = lastMatch['metadata']
        info = lastMatch['info'];
        me = info['participants'][my_index]

        print(f'match {matchId} received')
        myMatch = {
            'matchId': matchId,
            'gameMode': f"{info['gameMode']}",
            'champion': f"{me['championName']}",
            'date': info['gameStartTimestamp'],
            'durationSec': info['gameDuration'],
            'win': f"{me['win']}",
            'kills': me['kills'],
            'deaths': me['deaths'],
            'assists': me['assists'],
            'doubleKills': me['doubleKills'],
            'tripleKills': me['tripleKills'],
            'quadraKills': me['quadraKills'],
            'pentaKills': me['pentaKills'],
        }
        # print(json.dumps(myMatch, sort_keys=False, indent=4))

        procParamKeys = '@' + ' = ?, @'.join(myMatch.keys()) + ' = ?'
        procParamValues = tuple([i for i in myMatch.values()])
        SQL = f'EXEC {insertProc} {procParamKeys};'

        print(f'executing insert: {matchId}...')
        cursor.execute(SQL, procParamValues)
        print(f'insert done: {matchId}\n')

    while cursor.nextset(): pass
    cursor.commit()

print('All inserts done\n')









