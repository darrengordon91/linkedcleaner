document.addEventListener("DOMContentLoaded", () => {
    const settingsKeys = [
        "hide_likes",
        "hide_comments",
        "hide_reposts",
        "hide_suggested",
        "hide_prompted",
        "hide_old_posts",
        "time_filter"
    ];

    chrome.storage.sync.get(settingsKeys, (settings) => {
        for (const key in settings) {
            const el = document.getElementById(key);
            if (el) {
                if (el.type === "checkbox") el.checked = settings[key];
                else if (el.tagName === "SELECT") el.value = settings[key];
            }
        }
    });

    document.getElementById("saveBtn").addEventListener("click", () => {
        const newSettings = {};
        settingsKeys.forEach(key => {
            const el = document.getElementById(key);
            if (el) {
                newSettings[key] = el.type === "checkbox" ? el.checked : el.value;
            }
        });

        chrome.storage.sync.set(newSettings, () => {
            console.log("✅ Settings saved:", newSettings);

            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: () => window.location.reload(true) // 🔁 Full hard reload
                });
            });
        });
    });

    // Plugin badge
    const badge = document.getElementById("pluginBadge");
    if (badge) badge.style.display = "inline-block";
});
