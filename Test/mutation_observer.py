from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time, json

opts = Options()
opts.add_argument('--headless')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-dev-shm-usage')
opts.add_argument('--window-size=1400,900')

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)

# install overrides in current window, then navigate so overrides persist
inject = r"""
window.__dom_inserts = [];
(function(){
  function record(op, node, parent){
    try {
      var stack = (new Error()).stack;
      window.__dom_inserts.push({
        op: op,
        tag: node && node.outerHTML ? node.outerHTML.slice(0,200) : String(node),
        parent: parent && parent.outerHTML ? parent.outerHTML.slice(0,200) : String(parent),
        stack: stack
      });
    } catch(e){}
  }
  var origAppend = Node.prototype.appendChild;
  Node.prototype.appendChild = function(node){ record('appendChild', node, this); return origAppend.apply(this, arguments); };
  var origInsert = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function(node, ref){ record('insertBefore', node, this); return origInsert.apply(this, arguments); };
  var origReplace = Node.prototype.replaceChild;
  Node.prototype.replaceChild = function(newNode, oldNode){ record('replaceChild', newNode, this); return origReplace.apply(this, arguments); };
  var origClone = Node.prototype.cloneNode;
  Node.prototype.cloneNode = function(deep){ var res = origClone.apply(this, arguments); record('cloneNode', res, null); return res; };
})();
"""

# Start on about:blank and inject overrides
driver.get('about:blank')
driver.execute_script(inject)

# Navigate to target
url = 'http://127.0.0.1:8081/picoreflow/index.html'
print('Navigating to', url)
driver.execute_script('window.location.href = arguments[0];', url)
# wait for load
time.sleep(1.0)

# gather recorded inserts
try:
    inserts = driver.execute_script('return window.__dom_inserts || []')
except Exception as e:
    inserts = {'error': str(e)}

# save to file
with open('Test/mutation_inserts.json','w',encoding='utf8') as f:
    json.dump(inserts, f, ensure_ascii=False, indent=2)

print('Recorded', len(inserts), 'inserts')
for i,ins in enumerate(inserts[:20]):
    print('---', i, ins.get('op'), ins.get('tag')[:80].replace('\n',' '))

# screenshot
driver.save_screenshot('Test/mutation_index.png')
print('Saved Test/mutation_index.png')

driver.quit()
