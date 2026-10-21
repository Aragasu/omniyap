#!/usr/bin/env bash
# Builds the OmniYap Android APK using project-local SDK/Gradle installs (no system changes).
# Usage: bash scripts/android-build.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="$ROOT/.android-sdk"
GRADLE_HOME="$ROOT/.gradle-dist"
LOG="$ROOT/.research/android-build.log"

mkdir -p "$ROOT/.research" "$SDK"

if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  echo "==> downloading Android command-line tools"
  curl -fsSL -o /tmp/omniyap-clt.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  rm -rf "$SDK/cmdline-tools"
  mkdir -p "$SDK/cmdline-tools"
  unzip -q /tmp/omniyap-clt.zip -d "$SDK/cmdline-tools"
  mv "$SDK/cmdline-tools/cmdline-tools" "$SDK/cmdline-tools/latest"
fi

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export PATH="$SDK/platform-tools:$PATH"

JDK_HOME="$ROOT/.research/jdk"
if [ ! -x "$JDK_HOME/bin/jlink" ]; then
  # The Android Gradle plugin jlinks core-for-system-modules.jar, so a JRE (or a headless JDK without jlink) is not enough.
  echo "==> downloading Temurin JDK 21"
  curl -fsSL -o /tmp/omniyap-jdk.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"
  rm -rf "$JDK_HOME"
  mkdir -p "$JDK_HOME"
  tar -xzf /tmp/omniyap-jdk.tar.gz -C "$JDK_HOME" --strip-components=1
fi
export JAVA_HOME="$JDK_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

if [ -x "$JDK_HOME/bin/java" ]; then java -version 2>&1 | head -1; fi

echo "==> accepting licenses"
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses >/dev/null 2>&1 || true

echo "==> installing platform + build tools"
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platform-tools" "platforms;android-35" "build-tools;35.0.0"

if [ ! -x "$GRADLE_HOME/gradle-8.9/bin/gradle" ]; then
  echo "==> downloading Gradle 8.9"
  curl -fsSL -o /tmp/omniyap-gradle.zip https://services.gradle.org/distributions/gradle-8.9-bin.zip
  rm -rf "$GRADLE_HOME"
  mkdir -p "$GRADLE_HOME"
  unzip -q /tmp/omniyap-gradle.zip -d "$GRADLE_HOME"
fi

cd "$ROOT"
npm run build
cd "$ROOT/android"
"$GRADLE_HOME/gradle-8.9/bin/gradle" --no-daemon assembleDebug 2>&1 | tee "$LOG"

echo "==> APK:"
find "$ROOT/android/app/build/outputs" -name '*.apk' -print
