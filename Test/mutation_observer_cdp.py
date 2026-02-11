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

# Use CDP to evaluate script on new documents
try:
    driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {'source': inject})
except Exception as e:
    print('CDP injection failed:', e)

url = 'http://127.0.0.1:8081/picoreflow/index.html'
print('Navigating to', url)
driver.get(url)
# wait for load
time.sleep(1.0)

inserts = driver.execute_script('return window.__dom_inserts || []')
with open('Test/mutation_inserts_cdp.json','w',encoding='utf8') as f:
    json.dump(inserts, f, ensure_ascii=False, indent=2)

print('Recorded', len(inserts), 'inserts')
for i,ins in enumerate(inserts[:20]):
    print('---', i, ins.get('op'), ins.get('tag')[:80].replace('\n',' '))

driver.save_screenshot('Test/mutation_index_cdp.png')
print('Saved Test/mutation_index_cdp.png')

driver.quit()
