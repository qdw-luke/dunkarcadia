from flask import Flask, render_template
import requests
import json
app = Flask(__name__)



@app.route('/')
def home():
	return render_template('index.html')

@app.route('/crowdwise')
def crowdwise():
	response = requests.get(
	'https://crowdrise.com/api/get_event_donations/ArcadiaDunksforMeals/1451606400/1502915438/?api_key=26101b5fed16d157d3bbfa0c937021cc849b44ca&api_token=d7386545ed734a3581510d20740e1757bc572ae8'
	, auth=('crowdrise','apis4ndb0x')
	)
	data = json.dumps(response.json(), sort_keys=True, indent=4, separators=(',', ': '))
	return data


if __name__ == "__main__":
    application.run(host='0.0.0.0')