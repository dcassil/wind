#include <ArduinoJson.h>
#include <FS.h>
#include <WebSocketsServer.h>
#include "HelperFunctions.h"
#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_HMC5883_U.h>

static const int RXPin = 0, TXPin = 3;
static const uint32_t GPSBaud = 9600;
const char* ssid = "wind";
const char* pwd = "12345678";
const int analogInPin = A0;
long lastMillis = 0;
int sensorValue = 0;  // value read from the pot

Adafruit_HMC5883_Unified mag = Adafruit_HMC5883_Unified(12345);
IPAddress local_IP(192,168,4,22);
IPAddress gateway(192,168,4,9);
IPAddress subnet(255,255,255,0);
TinyGPSPlus gps;
SoftwareSerial ss(RXPin, TXPin);

void setup() {
  Serial.begin(115200);
  ss.begin(GPSBaud);
  delay(1000);
  SPIFFS.begin();
  Serial.println(); Serial.print("Configuring access point...");
  
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(ssid, pwd);   

  server.on("/", HTTP_GET, []() {
    handleFileRead("/");
  });

  server.onNotFound([]() {                          // Handle when user requests a file that does not exist
    if (!handleFileRead(server.uri()))
      server.send(404, "text/plain", "FileNotFound");
  });

  webSocket.begin();                                // start webSocket server
  webSocket.onEvent(webSocketEvent);                // callback function

  server.begin();
  Serial.println("HTTP server started");
}

String getRotation(int sensorValue) {
  int rotation = map(sensorValue, 10, 1024, 0, 360);

  while (rotation > 360)
  {
    rotation -= 360;
  }
  while (rotation < 0)
  {
    rotation += 360;
  }

  return String(rotation);
}

void loop() {                               // local var: type declaration at compile time
    
  int blaw;
    if (lastMillis + 500 < millis())
    {
      
      
      lastMillis = millis();
      sensorValue = analogRead(analogInPin);
      
      String rotationValue = getRotation(sensorValue);
      String lat = String(gps.location.lat());
      String lng = String(gps.location.lng());
      String deg = String(gps.course.deg());
      String magDeg;
      analogSample();
      if(mag.begin())
      {
        magDeg = String(displayCompassInfo());
      }

      String jsonLikeString = buildOutput(rotationValue, lat, lng, deg, magDeg);

      webSocket.sendTXT(socketNumber, jsonLikeString);

      server.handleClient();
      webSocket.loop();
      smartDelay(300);
    } 
}

float displayCompassInfo()
{
  /* Get a new sensor event */ 
  sensors_event_t event; 
  mag.getEvent(&event);
 
  /* Display the results (magnetic vector values are in micro-Tesla (uT)) */
  Serial.print("X: "); Serial.print(event.magnetic.x); Serial.print("  ");
  Serial.print("Y: "); Serial.print(event.magnetic.y); Serial.print("  ");
  Serial.print("Z: "); Serial.print(event.magnetic.z); Serial.print("  ");Serial.println("uT");

  // Hold the module so that Z is pointing 'up' and you can measure the heading with x&y
  // Calculate heading when the magnetometer is level, then correct for signs of axis.
  float heading = atan2(event.magnetic.y, event.magnetic.x);
  
  // Once you have your heading, you must then add your 'Declination Angle', which is the 'Error' of the magnetic field in your location.
  // Find yours here: http://www.magnetic-declination.com/
  // Mine is: -13* 2' W, which is ~13 Degrees, or (which we need) 0.22 radians
  // If you cannot find your Declination, comment out these two lines, your compass will be slightly off.
  float declinationAngle = 0.061377417846;
  heading += declinationAngle;
  
  // Correct for when signs are reversed.
  if(heading < 0)
    heading += 2*PI;
    
  // Check for wrap due to addition of declination.
  if(heading > 2*PI)
    heading -= 2*PI;
   
  // Convert radians to degrees for readability.
  float headingDegrees = heading * 180/M_PI; 
  
  Serial.print("Heading (degrees): "); Serial.println(headingDegrees);
  
  delay(100);
  return headingDegrees;
}

// This custom version of delay() ensures that the gps object
// is being "fed".
static void smartDelay(unsigned long ms)
{
  unsigned long start = millis();
  do 
  {
    while (ss.available())
      gps.encode(ss.read());
  } while (millis() - start < ms);
}

String buildOutput(String wind, String lat, String lng, String gpsDeg, String magDeg) {
  String out;

  out += "{";
  out += "\"wind\":\"" + wind + "\"\,";
  out += "\"lat\":\"" + lat + "\"\,";
  out += "\"lng\":\"" + lng + "\"\,";
  out += "\"gpsDeg\":\"" + gpsDeg + "\"\,";
  out += "\"magDeg\":\"" + magDeg + "\"";
  out += "}";

  return out;
}
