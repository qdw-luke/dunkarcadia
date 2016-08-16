import requests
import json

response = requests.get('https://crowdrise.com/api/get_event_donations/ArcadiaDunksforMeals/1451606400/1471365807/?api_key=26101b5fed16d157d3bbfa0c937021cc849b44ca&api_token=d7386545ed734a3581510d20740e1757bc572ae8', auth=('crowdrise','apis4ndb0x'))
print json.dumps(response.json(), sort_keys=True, indent=4, separators=(',', ': '))


