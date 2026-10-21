# Keep the JavaScript bridge if plugins ever call into it.
-keepclassmembers class website.omniyap.app.OmniYapBridge {
    public *;
}
