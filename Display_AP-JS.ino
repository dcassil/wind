#include <ArduinoJson.h>
#include <FS.h>
#include <WebSocketsServer.h>
#include "HelperFunctions.h"
#include <TinyGPS++.h>
#include <SoftwareSerial.h>

static const int RXPin = 0, TXPin = 3;
static const uint32_t GPSBaud = 9600;
const char* ssid = "wind";
const char* pwd = "12345678";
const int analogInPin = A0;
int lastMillis = 0;
int sensorValue = 0;  // value read from the pot
int outputValue = 0;  // value to output to a PWM pin

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
  yield();
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
      analogSample(); yield();

      String jsonLikeString = buildOutput(rotationValue, lat, lng, deg);
//      Serial.println(lat);
//      String jsonData = "{lat:" + lat + "\, lng:\" + lng + \"\, deg: \" + deg + \"}";
      webSocket.sendTXT(socketNumber, jsonLikeString);
      yield();

      server.handleClient();
      webSocket.loop();
      smartDelay(300);
    } 
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

String buildOutput(String wind, String lat, String lng, String deg) {
  String out;

  out += "{";
  out += "\"wind\":\"" + wind + "\"\,";
  out += "\"lat\":\"" + lat + "\"\,";
  out += "\"lng\":\"" + lng + "\"\,";
  out += "\"deg\":\"" + deg + "\"";
  out += "}";

  return out;
}
