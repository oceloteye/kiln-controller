const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { expect } = require('chai');

describe('Save modal', function() {
  it('closes on successful save (tmp websocket response)', function(done) {
    this.timeout(2000);

    const codePath = path.join(__dirname, '..', 'public', 'assets', 'js', 'picoreflow.js');
    const code = fs.readFileSync(codePath, 'utf8');

    // State we will inspect
    let modalHidden = false;
    const settingsBtnState = { disabled: false, textVal: 'Save' };

    // Minimal jQuery-like mock for selectors used by saveSettings
    function makeSettingsBtn() {
      return {
        prop: function(k, v) { if (k === 'disabled') { settingsBtnState.disabled = v; return this; } return this; },
        text: function(t) { if (t === undefined) return settingsBtnState.textVal; settingsBtnState.textVal = t; return this; }
      };
    }

    function makeModal() {
      return {
        modal: function(action) { if (action === 'hide') modalHidden = true; },
        is: function() { return true; }
      };
    }

    const sandbox$ = function(sel) {
      if (sel === '#settingsModal') return makeModal();
      if (sel === '#settings_save_btn') return makeSettingsBtn();
      if (sel === '#kwh_rate_input' || sel === '#kw_elements_input' || sel === '#currency_type_input') {
        return { val: function() { return ''; } };
      }
      return { prop: ()=>{}, text: ()=>{}, val: ()=>{}, is: ()=>false, modal: ()=>{} };
    };
    sandbox$.bootstrapGrowl = function(){};

    // Mock WebSocket which sends a message (successful response) shortly after open
    class MockWebSocket {
      constructor(url) {
        this.url = url;
        setTimeout(() => { if (this.onopen) this.onopen(); }, 0);
        setTimeout(() => { if (this.onmessage) this.onmessage({ data: '{}' }); }, 20);
      }
      send() {}
      close() {}
    }

    const sandbox = {
      console,
      $, // placeholder overwritten below
      WebSocket: MockWebSocket,
      host: 'ws://localhost',
      ws_config: undefined,
      expectingConfigAck: false,
      configAckTimer: null,
      setTimeout,
      clearTimeout
    };

    // assign $ mock into sandbox
    sandbox.$ = sandbox$;

    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);

    // call the function from the evaluated code
    if (typeof sandbox.saveSettings !== 'function') return done(new Error('saveSettings not defined'));
    sandbox.saveSettings();

    // Wait a bit for the mocked websocket to trigger onmessage
    setTimeout(() => {
      try {
        expect(modalHidden).to.equal(true);
        expect(settingsBtnState.textVal).to.equal('Save');
        expect(settingsBtnState.disabled).to.equal(false);
        done();
      } catch (err) {
        done(err);
      }
    }, 150);
  });
});
