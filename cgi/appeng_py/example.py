#don't forget to change example.appspot.com to real name

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext import db
from google.appengine.api import memcache

import json
import datetime

def get_count_query():
	count = memcache.get('count')
	query = memcache.get('query')
	if count is None or query is None:
		query = GPSdata.all()
		count = query.count()
		memcache.set('count', count)
		memcache.set('query', query)
		
	return count, query
	
def incr_count():
	count, _ = get_count_query()
	memcache.incr('count')
	
def flash_cache():
	#flash cache - new items in DB
	memcache.delete('query')
	return get_count_query()

index_header = """<html>
  <head>
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no">
    <meta charset="utf-8">
    <title>Google Maps JavaScript API v3 Example: KmlLayer KML</title>
    <style type="text/css">
    	html, body {
  			height: 100%;
  			margin: 0;
  			padding: 0;
			}

		#map_canvas {
  			height: 100%;
		}

		@media print {
  			html, body {
    		height: auto;
  		}

  		#map_canvas {
    		height: 650px;
  		}
	}
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false"></script>
    <script>
      function initialize() {\n"""
current = "        var current = new google.maps.LatLng(%f, %f);\n"
index_footer = """        var mapOptions = {
          center: current,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }

        var map = new google.maps.Map(document.getElementById('map_canvas'), mapOptions);

        var ctaLayer = new google.maps.KmlLayer('http://example.appspot.com/get/kml%s');
        ctaLayer.setMap(map);
      }
    </script>
  </head>
  <body onload="initialize()">
    <div id="map_canvas"></div>
  </body>
</html>"""

class MainPage(webapp.RequestHandler):
	def get(self):
		limit = self.request.get('limit')
		if limit: limit = '?limit='+limit
			
		self.response.out.write(index_header)
		
		_, query = get_count_query()
		last = query.order("-date").get()
		
		if last:
			self.response.out.write(current % (last.gps.lat, last.gps.lon))
		else:
			self.response.out.write(current % (0, 0))
		self.response.out.write(index_footer % limit)					  

class GPSdata(db.Model):
	date = db.DateTimeProperty(required=True)
	gps = db.GeoPtProperty(required=True)
	#altitude
	alt = db.FloatProperty(required=True)
	#vertical accuracy
	va = db.IntegerProperty()
	#horizontal accuracy
	ha = db.IntegerProperty()

kml_header = """<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>My Tracker</name>
    <description>Google Latitude by yourself</description>
    <Style id="blueline">
      <LineStyle>
        <color>ffff0000</color>
        <width>3</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>Line Track</name>
      <description>your object on track</description>
      <styleUrl>#blueline</styleUrl>
      <LineString>
        <altitudeMode>relative</altitudeMode>
        <coordinates>\n"""

kml_center = """        </coordinates>
      </LineString>
    </Placemark>\n"""
        
kml_point = """<Placemark>
      <name>Point</name>
      <description>last seen:%s</description>
      <Point>
        <altitudeMode>relative</altitudeMode>
        <coordinates>
        %f,%f,%f\n
        </coordinates>
      </Point>
    </Placemark>\n"""        

kml_footer = """  </Document>
</kml>"""

class KML(webapp.RequestHandler):
	def get(self):
		try:
			count_limit = int(self.request.get('limit'))
		except (TypeError, ValueError):
			count_limit = 60
		
		self.response.headers['Content-Type'] = 'application/vnd.google-earth.kml+xml'
		self.response.out.write(kml_header)
		
		last_count =  memcache.get('last_count')
		if last_count is None: last_count = 0

		count, query = get_count_query()
		
		if count != last_count:
			#flash cache to get query with new entries
			count, query = flash_cache()
		
		memcache.set('last_count', count)
		
		query = query.order("-date")
		
		#line coordinates
		for entity in query.run(limit = count_limit):
			self.response.out.write("%f,%f,%f\n" % (entity.gps.lon,
													entity.gps.lat,
													entity.alt))
													
		self.response.out.write(kml_center)
		
		#last point coordinates
		entity = query.get()
		if entity:
			self.response.out.write(kml_point % (entity.date.strftime("%x %X"),
													entity.gps.lon,
													entity.gps.lat,
													entity.alt))
			
		self.response.out.write(kml_footer)

db_limit = 43200
bunch_offset = 1440

class InputJSON(webapp.RequestHandler):
	def post(self):
		fixes = self.request.get("fixes")

		if fixes:
			try:
				fixes = json.loads(fixes)
				for f in fixes:
					if all(k in f for k in (u'va', u'll', u'al', u't', u'ha')):
					
						if isinstance(f[u't'], list):
							date = f[u't'][0]
						else: date = f[u't']
						
						self.response.out.write(json.dumps({u'fix_tlist': [date]}))
						
						if len(str(abs(date))) > 11:
							date = int(date/1000)
							
						GPSdata(date = datetime.datetime.fromtimestamp(date),
							gps = db.GeoPt(float(f[u'll'][0]), float(f[u'll'][1])),
							alt = float(f[u'al']),
							va = f[u'va'],
							ha = f[u'ha']).put()
						
						#increment count in cache
						incr_count()
						
						break
				
				#get count and query from cache
				count, query = get_count_query()
			
				to_delete = count - db_limit
				if to_delete >= bunch_offset:
					#flash cache and get new query to delete items
					_, query = flash_cache()
					for key in query.order("date").run(limit = bunch_offset, keys_only=True):
						db.delete(key)
					#flash cache to update count and query
					_, _ = flash_cache()
			
			except ValueError:
				self.response.out.write("Incorect Receive:" + str(fixes) + "\n")
				self.error(500)
				return
				
	
application = webapp.WSGIApplication([('/', MainPage), 
									  ('/get/kml', KML),
									  ('/put/json', InputJSON)], debug=True)

def main():				
	run_wsgi_app(application)

if __name__ == "__main__":
	main()
