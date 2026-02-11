from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=1400,900')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

url = 'http://127.0.0.1:8081/picoreflow/index.html'
print('Loading', url)
driver.get(url)
time.sleep(0.8)
containers = driver.execute_script("return Array.from(document.querySelectorAll('.container')).map(function(el){return {id:el.id || null, class:el.className, outer: el.outerHTML.slice(0,200)} });")
print('containers_count=', len(containers))
for i,c in enumerate(containers):
    print('---')
    print('index=', i)
    print('id=', c['id'])
    print('class=', c['class'])
    print('outer_snippet=', c['outer'].replace('\n',' '))

screenshot='inspect_index.png'
driver.save_screenshot(screenshot)
print('screenshot saved to', screenshot)

driver.quit()
