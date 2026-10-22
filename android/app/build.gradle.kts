import java.io.File

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "website.omniyap.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "website.omniyap.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "0.2.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    androidResources {
        noCompress += "js"
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
}

/**
 * The mod bundle is built once, in the repository root (`npm run build`), and shared by every
 * platform. Copy it into assets before the APK is assembled so Android can inject the exact same
 * renderer as the desktop app.
 */
val copyRenderer by tasks.registering(Copy::class) {
    val source = rootProject.projectDir.resolve("../dist/renderer.js")
    from(source)
    into(project.layout.projectDirectory.dir("src/main/assets"))
    doFirst {
        if (!source.exists()) {
            throw GradleException("dist/renderer.js is missing — run `npm run build` in the project root first")
        }
    }
}

tasks.named("preBuild") {
    dependsOn(copyRenderer)
}
