import React from "react";
import { Helmet } from "react-helmet-async";

export default function VRScreen() {
  return (
    <div>
      <Helmet>
        <title>VR Showroom</title>
      </Helmet>
      <h1>Coming Soon</h1>
      <div style={{ position: "relative" }}>
        <div
          style={{
            paddingBottom: "56.25%",
            height: 0,
            overflow: "hidden",
            maxWidth: "100%",
          }}
        >
          <iframe
            src="https://seekbeak.com/v/YD1GOKrw1by"
            title="VR Showroom"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allowFullScreen={true}
            webkitAllowFullScreen
            mozallowfullscreen
            allow="accelerometer;autoplay;encrypted-media;gyroscope;xr-spatial-tracking;xr;geolocation;picture-in-picture;fullscreen;camera;microphone"
          ></iframe>
        </div>
      </div>
    </div>
  );
}
