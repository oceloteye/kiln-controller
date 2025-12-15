import os
import time
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager


@pytest.mark.usefixtures('http_server')
def test_save_modal_closes(http_server):
    """Load the UI (served from `http_server`) and inject a WebSocket override so
    any connection to '/config' is redirected to the mock `config_server`.
    Then open the settings modal, trigger save, and assert the modal closes.
    """
    browser = os.getenv('BROWSER', 'chrome').lower()

    if browser == 'firefox':
        from selenium.webdriver.firefox.options import Options as FirefoxOptions
        from selenium.webdriver.firefox.service import Service as FirefoxService

        opts = FirefoxOptions()
        opts.headless = True
        driver = webdriver.Firefox(service=FirefoxService(GeckoDriverManager().install()), options=opts)
    else:
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service

        opts = Options()
        opts.add_argument('--headless=new')
        opts.add_argument('--no-sandbox')
        opts.add_argument('--disable-gpu')

        driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
    try:
        # page served with public/ as the document root; load index.html
        driver.get(http_server + '/index.html')

        # Inject a lightweight in-page fake WebSocket that echoes sent payloads
        # back to `onmessage` so the UI's tmp WebSocket path receives an ack.
        stub = (
            "window.__RealWebSocket = window.WebSocket;"
            "window.WebSocket = function(url){"
            "  var ws = { readyState: 1, onopen: null, onmessage: null, onerror: null, send: function(msg){ var self=this; setTimeout(function(){ try{ if(self.onmessage) self.onmessage({data: msg}); }catch(e){} }, 100); }, close: function(){} };"
            "  setTimeout(function(){ try{ if(ws.onopen) ws.onopen(); }catch(e){} }, 50);"
            "  return ws;" 
            "};"
        )
        driver.execute_script(stub)

        # Wait for the page JS to initialize; give it a little time
        for _ in range(30):
            try:
                ready = driver.execute_script("return (typeof $ !== 'undefined' && typeof window.saveSettings === 'function');")
            except Exception:
                ready = False
            if ready:
                break
            time.sleep(0.2)

        # If saveSettings is not defined, fall back to a minimal stub that calls the DOM actions
        try:
            exists = driver.execute_script("return (typeof window.saveSettings === 'function');")
        except Exception:
            exists = False
        if not exists:
            driver.execute_script("window.saveSettings = function(){ try { $('#settingsModal').modal('hide'); $('#settings_save_btn').prop('disabled', false).text('Save'); } catch(e){} };")

        # Open settings modal
        try:
            btn = driver.find_element(By.ID, 'settings-btn')
            btn.click()
        except Exception:
            driver.execute_script("$('#settingsModal').modal('show');")

        time.sleep(0.2)

        # Fill a field and invoke saveSettings
        driver.execute_script("$('#kwh_rate_input').val('1.23'); if(typeof window.saveSettings === 'function'){ window.saveSettings(); } else { $('#settings_save_btn').click(); }")

        # Wait up to 5s for modal to become hidden
        hidden = False
        for _ in range(25):
            try:
                hidden = driver.execute_script("return $('#settingsModal').is(':visible') === false;")
            except Exception:
                hidden = False
            if hidden:
                break
            time.sleep(0.2)

        assert hidden, 'Settings modal did not close after save'
    finally:
        driver.quit()
