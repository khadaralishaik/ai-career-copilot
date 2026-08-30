package com.khadarali.handshaketaskalert

import android.Manifest
import android.annotation.SuppressLint
import android.app.*
import android.os.*
import android.speech.tts.TextToSpeech
import android.view.*
import android.webkit.*
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private lateinit var tts: TextToSpeech
    private val handler = Handler(Looper.getMainLooper())
    private var lastSignal = ""
    private var monitoring = true
    private val url = "https://ai.joinhandshake.com/"
    private val keywords = arrayOf("task available", "tasks available", "available task", "start task", "new task", "claim task")

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 10)
        tts = TextToSpeech(this) { if (it == TextToSpeech.SUCCESS) tts.language = Locale.US }
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val bar = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; setPadding(12,8,12,8) }
        val status = TextView(this).apply { text = "  ● Monitoring every 10 seconds"; textSize = 14f }
        val refresh = Button(this).apply { text = "Refresh" }
        val toggle = Button(this).apply { text = "Pause" }
        bar.addView(status, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)); bar.addView(refresh); bar.addView(toggle)
        web = WebView(this)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.databaseEnabled = true
        web.settings.userAgentString = web.settings.userAgentString + " HandshakeTaskAlert/1.1"
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, u: String?) { scheduleCheck() }
        }
        root.addView(bar); root.addView(web, LinearLayout.LayoutParams(-1,0,1f)); setContentView(root)
        refresh.setOnClickListener { web.reload() }
        toggle.setOnClickListener { monitoring = !monitoring; toggle.text = if (monitoring) "Pause" else "Resume"; status.text = if (monitoring) "  ● Monitoring every 10 seconds" else "  ○ Monitoring paused"; if (monitoring) scheduleCheck() }
        web.loadUrl(url)
    }

    private fun scheduleCheck() {
        handler.removeCallbacksAndMessages(null)
        if (!monitoring) return
        handler.postDelayed({ checkPage() }, 10000)
    }

    private fun checkPage() {
        if (!monitoring) return
        web.evaluateJavascript("document.body ? document.body.innerText : ''") { raw ->
            val text = android.text.Html.fromHtml(raw.trim('"').replace("\\n","<br>"), android.text.Html.FROM_HTML_MODE_LEGACY).toString().lowercase(Locale.US)
            val hit = keywords.firstOrNull { text.contains(it) }
            if (hit != null && hit != lastSignal) {
                lastSignal = hit
                announce("Handshake AI task available. $hit.")
                notifyUser("Handshake AI task available", "Detected: $hit")
            } else if (hit == null) lastSignal = ""
        }
        web.reload()
        handler.postDelayed({ checkPage() }, 10000)
    }

    private fun announce(message: String) { tts.speak(message, TextToSpeech.QUEUE_FLUSH, null, "handshake-task") }
    private fun notifyUser(title: String, body: String) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("tasks","Task alerts",NotificationManager.IMPORTANCE_HIGH))
        nm.notify(2001, Notification.Builder(this,"tasks").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body).setAutoCancel(true).build())
    }
    override fun onDestroy() { handler.removeCallbacksAndMessages(null); tts.stop(); tts.shutdown(); web.destroy(); super.onDestroy() }
}
