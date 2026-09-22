var state = "IDLE";
var state_last = "";
var graph = [ 'profile', 'live'];
var points = [];
var profiles = [];
var time_mode = 0;
var selected_profile = 0;
var selected_profile_name = 'cone-05-long-bisque.json';
var temp_scale = "c";
var time_scale_slope = "s";
var time_scale_profile = "h";
var time_scale_long = "Seconds";
var temp_scale_display = "C";
var kwh_rate = 0.26;
var currency_type = "EUR";

var protocol = 'ws:';
if (window.location.protocol == 'https:') {
    protocol = 'wss:';
}
var host = "" + protocol + "//" + window.location.hostname + ":" + window.location.port;
var ws_status = new WebSocket(host+"/status");
var ws_control = new WebSocket(host+"/control");
var ws_config = new WebSocket(host+"/config");
var ws_storage = new WebSocket(host+"/storage");


if(window.webkitRequestAnimationFrame) window.requestAnimationFrame = window.webkitRequestAnimationFrame;

graph.profile =
{
    label: "Profile",
    data: [],
    points: { show: false },
    color: "#75890c",
    draggable: false
};

graph.live =
{
    label: "Live",
    data: [],
    points: { show: false },
    color: "#d8d3c5",
    draggable: false
};


function updateProfile(id)
{
    selected_profile = id;
    selected_profile_name = profiles[id].name;
    var job_seconds = profiles[id].data.length === 0 ? 0 : parseInt(profiles[id].data[profiles[id].data.length-1][0]);
    var kwh = (3850*job_seconds/3600/1000).toFixed(2);
    var cost =  (kwh*kwh_rate).toFixed(2);
    var job_time = new Date(job_seconds * 1000).toISOString().substr(11, 8);
    $('#sel_prof').html(profiles[id].name);
    $('#sel_prof_eta').html(job_time);
    $('#sel_prof_cost').html(kwh + ' kWh ('+ currency_type +': '+ cost +')');
    graph.profile.data = profiles[id].data;
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
}

function deleteProfile()
{
    var profile = { "type": "profile", "data": "", "name": selected_profile_name };
    var delete_struct = { "cmd": "DELETE", "profile": profile };

    var delete_cmd = JSON.stringify(delete_struct);
    console.log("Delete profile:" + selected_profile_name);

    ws_storage.send(delete_cmd);

    ws_storage.send('GET');
    selected_profile_name = profiles[0].name;

    state="IDLE";
    $('#edit').hide();
    $('#profile_selector').show();
    $('#btn_controls').show();
    $('#status').slideDown();
    $('#profile_table').slideUp();
    $('#e2').select2('val', 0);
    graph.profile.points.show = false;
    graph.profile.draggable = false;
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
}


function updateProgress(percentage)
{
    if(state=="RUNNING")
    {
        if(percentage > 100) percentage = 100;
        $('#progressBar').css('width', percentage+'%');
        if(percentage>5) $('#progressBar').html(parseInt(percentage)+'%');
    }
    else
    {
        $('#progressBar').css('width', 0+'%');
        $('#progressBar').html('');
    }
}

function updateProfileTable()
{
    var dps = 0;
    var slope = "";
    var color = "";

    var html = '<h3>Schedule Points</h3><div class="table-responsive" style="scroll: none"><table class="table table-striped">';
        html += '<tr><th style="width: 50px">#</th><th>Target Time in ' + time_scale_long+ '</th><th>Target Temperature in °'+temp_scale_display+'</th><th>Slope in &deg;'+temp_scale_display+'/'+time_scale_slope+'</th><th></th></tr>';

    for(var i=0; i<graph.profile.data.length;i++)
    {

        if (i>=1) dps =  ((graph.profile.data[i][1]-graph.profile.data[i-1][1])/(graph.profile.data[i][0]-graph.profile.data[i-1][0]) * 10) / 10;
        if (dps  > 0) { slope = "up";     color="rgba(206, 5, 5, 1)"; } else
        if (dps  < 0) { slope = "down";   color="rgba(23, 108, 204, 1)"; dps *= -1; } else
        if (dps == 0) { slope = "right";  color="grey"; }

        html += '<tr><td><h4>' + (i+1) + '</h4></td>';
        html += '<td><input type="text" class="form-control" id="profiletable-0-'+i+'" value="'+ timeProfileFormatter(graph.profile.data[i][0],true) + '" style="width: 60px" /></td>';
        html += '<td><input type="text" class="form-control" id="profiletable-1-'+i+'" value="'+ graph.profile.data[i][1] + '" style="width: 60px" /></td>';
        html += '<td><div class="input-group"><span class="glyphicon glyphicon-circle-arrow-' + slope + ' input-group-addon ds-trend" style="background: '+color+'"></span><input type="text" class="form-control ds-input" readonly value="' + formatDPS(dps) + '" style="width: 100px" /></div></td>';
        html += '<td>&nbsp;</td></tr>';
    }

    html += '</table></div>';

    $('#profile_table').html(html);

    //Link table to graph
    $(".form-control").change(function(e)
        {
            var id = $(this)[0].id; //e.currentTarget.attributes.id
            var value = parseInt($(this)[0].value);
            var fields = id.split("-");
            var col = parseInt(fields[1]);
            var row = parseInt(fields[2]);

            if (graph.profile.data.length > 0) {
            if (col == 0) {
                graph.profile.data[row][col] = timeProfileFormatter(value,false);
            }
            else {
                graph.profile.data[row][col] = value;
            }

            graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
            }
            updateProfileTable();

        });
}

function timeProfileFormatter(val, down) {
    var rval = val
    switch(time_scale_profile){
        case "m":
            if (down) {rval = val / 60;} else {rval = val * 60;}
            break;
        case "h":
            if (down) {rval = val / 3600;} else {rval = val * 3600;}
            break;
    }
    return Math.round(rval);
}

function formatDPS(val) {
    var tval = val;
    if (time_scale_slope == "m") {
        tval = val * 60;
    }
    if (time_scale_slope == "h") {
        tval = (val * 60) * 60;
    }
    return Math.round(tval);
}

function hazardTemp(){

    if (temp_scale == "f") {
        return (1500 * 9 / 5) + 32
    }
    else {
        return 1500
    }
}

function timeTickFormatter(val,axis)
{
// hours
if(axis.max>3600) {
  //var hours = Math.floor(val / (3600));
  //return hours;
  return Math.floor(val/3600);
  }

// minutes
if(axis.max<=3600) {
  return Math.floor(val/60);
  }

// seconds
if(axis.max<=60) {
  return val;
  }
}

function runTask()
{
    var cmd =
    {
        "cmd": "RUN",
        "profile": profiles[selected_profile]
    }

    graph.live.data = [];
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());

    ws_control.send(JSON.stringify(cmd));

}

function runTaskSimulation()
{
    var cmd =
    {
        "cmd": "SIMULATE",
        "profile": profiles[selected_profile]
    }

    graph.live.data = [];
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());

    ws_control.send(JSON.stringify(cmd));

}


function abortTask()
{
    var cmd = {"cmd": "STOP"};
    ws_control.send(JSON.stringify(cmd));
}

function enterNewMode()
{
    state="EDIT"
    $('#status').slideUp();
    $('#edit').show();
    $('#profile_selector').hide();
    $('#btn_controls').hide();
    $('#form_profile_name').attr('value', '');
    $('#form_profile_name').attr('placeholder', 'Please enter a name');
    graph.profile.points.show = true;
    graph.profile.draggable = true;
    graph.profile.data = [];
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
    updateProfileTable();
}

function enterEditMode()
{
    state="EDIT"
    $('#status').slideUp();
    $('#edit').show();
    $('#profile_selector').hide();
    $('#btn_controls').hide();
    console.log(profiles);
    $('#form_profile_name').val(profiles[selected_profile].name);
    graph.profile.points.show = true;
    graph.profile.draggable = true;
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
    updateProfileTable();
    toggleTable();
}

function leaveEditMode()
{
    selected_profile_name = $('#form_profile_name').val();
    ws_storage.send('GET');
    state="IDLE";
    $('#edit').hide();
    $('#profile_selector').show();
    $('#btn_controls').show();
    $('#status').slideDown();
    $('#profile_table').slideUp();
    graph.profile.points.show = false;
    graph.profile.draggable = false;
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
}

function newPoint()
{
    if(graph.profile.data.length > 0)
    {
        var pointx = parseInt(graph.profile.data[graph.profile.data.length-1][0])+15;
    }
    else
    {
        var pointx = 0;
    }
    graph.profile.data.push([pointx, Math.floor((Math.random()*230)+25)]);
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
    updateProfileTable();
}

function delPoint()
{
    graph.profile.data.splice(-1,1)
    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ], getOptions());
    updateProfileTable();
}

function toggleTable()
{
    if($('#profile_table').css('display') == 'none')
    {
        $('#profile_table').slideDown();
    }
    else
    {
        $('#profile_table').slideUp();
    }
}

function saveProfile()
{
    name = $('#form_profile_name').val();
    var rawdata = graph.plot.getData()[0].data
    var data = [];
    var last = -1;

    for(var i=0; i<rawdata.length;i++)
    {
        if(rawdata[i][0] > last)
        {
          data.push([rawdata[i][0], rawdata[i][1]]);
        }
        else
        {
          $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span> <b>ERROR 88:</b><br/>An oven is not a time-machine", {
            ele: 'body', // which element to append to
            type: 'alert', // (null, 'info', 'error', 'success')
            offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
            align: 'center', // ('left', 'right', or 'center')
            width: 385, // (integer, or 'auto')
            delay: 5000,
            allow_dismiss: true,
            stackup_spacing: 10 // spacing between consecutively stacked growls.
          });

          return false;
        }

        last = rawdata[i][0];
    }

    var profile = { "type": "profile", "data": data, "name": name }
    var put = { "cmd": "PUT", "profile": profile }

    var put_cmd = JSON.stringify(put);

    ws_storage.send(put_cmd);

    leaveEditMode();
}

function get_tick_size() {
//switch(time_scale_profile){
//  case "s":
//    return 1;
//  case "m":
//    return 60;
//  case "h":
//    return 3600;
//  }
return 3600;
}

function getOptions()
{

  var options =
  {

    series:
    {
        lines:
        {
            show: true
        },

        points:
        {
            show: true,
            radius: 5,
            symbol: "circle"
        },

        shadowSize: 3

    },

	xaxis:
    {
      min: 0,
      tickColor: 'rgba(216, 211, 197, 0.2)',
      tickFormatter: timeTickFormatter,
      tickSize: get_tick_size(),
      font:
      {
        size: 14,
        lineHeight: 14,        weight: "normal",
        family: "Digi",
        variant: "small-caps",
        color: "rgba(216, 211, 197, 0.85)"
      }
	},

	yaxis:
    {
      min: 0,
      tickDecimals: 0,
      draggable: false,
      tickColor: 'rgba(216, 211, 197, 0.2)',
      font:
      {
        size: 14,
        lineHeight: 14,
        weight: "normal",
        family: "Digi",
        variant: "small-caps",
        color: "rgba(216, 211, 197, 0.85)"
      }
	},

	grid:
    {
	  color: 'rgba(216, 211, 197, 0.55)',
      borderWidth: 1,
      labelMargin: 10,
      mouseActiveRadius: 50
	},

    legend:
    {
      show: false
    }
  }

  return options;

}



$(document).ready(function()
{

    if(!("WebSocket" in window))
    {
        $('#chatLog, input, button, #examples').fadeOut("fast");
        $('<p>Oh no, you need a browser that supports WebSockets. How about <a href="http://www.google.com/chrome">Google Chrome</a>?</p>').appendTo('#container');
    }
    else
    {

        // Status Socket ////////////////////////////////

        ws_status.onopen = function()
        {
            console.log("Status Socket has been opened");

//            $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span>Getting data from server",
//            {
//            ele: 'body', // which element to append to
//            type: 'success', // (null, 'info', 'error', 'success')
//            offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
//            align: 'center', // ('left', 'right', or 'center')
//            width: 385, // (integer, or 'auto')
//            delay: 2500,
//            allow_dismiss: true,
//            stackup_spacing: 10 // spacing between consecutively stacked growls.
//            });
        };

        ws_status.onclose = function()
        {
            $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span> <b>ERROR 1:</b><br/>Status Websocket not available", {
            ele: 'body', // which element to append to
            type: 'error', // (null, 'info', 'error', 'success')
            offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
            align: 'center', // ('left', 'right', or 'center')
            width: 385, // (integer, or 'auto')
            delay: 5000,
            allow_dismiss: true,
            stackup_spacing: 10 // spacing between consecutively stacked growls.
          });
        };

        ws_status.onmessage = function(e)
        {
            x = JSON.parse(e.data);
            if (x.type == "backlog")
            {
                if (x.profile)
                {
                    selected_profile_name = x.profile.name;
                    $.each(profiles,  function(i,v) {
                        if(v.name == x.profile.name) {
                            updateProfile(i);
                            $('#e2').select2('val', i);
                        }
                    });
                }

                $.each(x.log, function(i,v) {
                    graph.live.data.push([v.runtime, v.temperature]);
                    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
                });
            }

            if(state!="EDIT")
            {
                state = x.state;
                if (state!=state_last)
                {
                    if(state_last == "RUNNING" && state != "PAUSED" )
                    {
			console.log(state);
                        $('#target_temp').html('---');
                        updateProgress(0);
                        $.bootstrapGrowl("<span class=\"glyphicon glyphicon-exclamation-sign\"></span> <b>Run completed</b>", {
                        ele: 'body', // which element to append to
                        type: 'success', // (null, 'info', 'error', 'success')
                        offset: {from: 'top', amount: 250}, // 'top', or 'bottom'
                        align: 'center', // ('left', 'right', or 'center')
                        width: 385, // (integer, or 'auto')
                        delay: 0,
                        allow_dismiss: true,
                        stackup_spacing: 10 // spacing between consecutively stacked growls.
                        });
                    }
                }

                if(state=="RUNNING")
                {
                    $("#nav_start").hide();
                    $("#nav_stop").show();

                    graph.live.data.push([x.runtime, x.temperature]);
                    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());

                    left = parseInt(x.totaltime-x.runtime);
                    eta = new Date(left * 1000).toISOString().substr(11, 8);

                    updateProgress(parseFloat(x.runtime)/parseFloat(x.totaltime)*100);
                    $('#state').html('<span class="glyphicon glyphicon-time" style="font-size: 22px; font-weight: normal"></span><span style="font-family: Digi; font-size: 40px;">' + eta + '</span>');
                    $('#target_temp').html(parseInt(x.target));
                    $('#cost').html(x.currency_type + parseFloat(x.cost).toFixed(2));
                  


                }
                else
                {
                    $("#nav_start").show();
                    $("#nav_stop").hide();
                    $('#state').html('<p class="ds-text">'+state+'</p>');
                }

                $('#act_temp').html(parseInt(x.temperature));
                heat_rate = parseInt(x.heat_rate)
                if (heat_rate > 9999) { heat_rate = 9999; }
                if (heat_rate < -9999) { heat_rate = -9999; }
                $('#heat_rate').html(heat_rate);
                if (typeof x.pidstats !== 'undefined') {
                    $('#heat').html('<div class="bar" style="height:'+x.pidstats.out*70+'%;"></div>')
                    }
                if (x.cool > 0.5) { $('#cool').addClass("ds-led-cool-active"); } else { $('#cool').removeClass("ds-led-cool-active"); }
                if (x.air > 0.5) { $('#air').addClass("ds-led-air-active"); } else { $('#air').removeClass("ds-led-air-active"); }
                if (x.temperature > hazardTemp()) { $('#hazard').addClass("ds-led-hazard-active"); } else { $('#hazard').removeClass("ds-led-hazard-active"); }
                if ((x.door == "OPEN") || (x.door == "UNKNOWN")) { $('#door').addClass("ds-led-door-open"); } else { $('#door').removeClass("ds-led-door-open"); }

                state_last = state;

            }
        };

        // Config Socket /////////////////////////////////

        ws_config.onopen = function()
        {
            ws_config.send('GET');
        };

        function applySettings(cfg) {
            if (!cfg) return;
            temp_scale = cfg.temp_scale || temp_scale;
            time_scale_slope = cfg.time_scale_slope || time_scale_slope;
            time_scale_profile = cfg.time_scale_profile || time_scale_profile;
            if (typeof cfg.kwh_rate !== 'undefined') {
                var parsed = parseFloat(cfg.kwh_rate);
                if (!isNaN(parsed)) kwh_rate = parsed;
            }
            currency_type = cfg.currency_type || currency_type;

            temp_scale_display = (temp_scale == "c") ? "C" : "F";
            $('#act_temp_scale').html('º'+temp_scale_display);
            $('#target_temp_scale').html('º'+temp_scale_display);
            $('#heat_rate_temp_scale').html('º'+temp_scale_display);

            switch(time_scale_profile){
                case "s":
                    time_scale_long = "Seconds";
                    break;
                case "m":
                    time_scale_long = "Minutes";
                    break;
                case "h":
                    time_scale_long = "Hours";
                    break;
            }

            // Refresh UI that depends on settings
            try { updateProfileTable(); } catch (e) { }
            try { updateProfile(selected_profile); } catch (e) { }
        }

        ws_config.onmessage = function(e)
        {
            console.log(e.data);
            x = JSON.parse(e.data);

            // Server SET response format: { status: 'OK'|'ERROR', settings: { ... } }
            if (x && x.status) {
                if (x.status === 'OK' && x.settings) {
                    applySettings(x.settings);
                    $.bootstrapGrowl('Settings saved', {type:'success', delay:2000, offset:{from:'top',amount:250}});
                }
                else {
                    $.bootstrapGrowl('Failed to save settings', {type:'error', delay:3000, offset:{from:'top',amount:250}});
                }
                return;
            }

            // Otherwise, server sends the full config JSON
            applySettings(x);
        }

        // Settings modal wiring with validation
        $('#saveSettingsBtn').on('click', function(){
            var newScale = $('#setting_temp_scale').val();
            var newKwhRaw = $('#setting_kwh_rate').val();
            var newCurrency = $('#setting_currency').val();

            // Validation
            var newKwh = parseFloat(newKwhRaw);
            if (isNaN(newKwh) || newKwh < 0) {
                $.bootstrapGrowl('Please enter a valid kWh rate', {type:'error', delay:3000, offset:{from:'top',amount:250}});
                return;
            }
            if (!newCurrency || newCurrency.trim().length === 0) {
                $.bootstrapGrowl('Please enter a currency symbol', {type:'error', delay:3000, offset:{from:'top',amount:250}});
                return;
            }

            var payload = { cmd: 'SET', settings: { temp_scale: newScale, kwh_rate: newKwh, currency_type: newCurrency } };
            try {
                ws_config.send(JSON.stringify(payload));
                $.bootstrapGrowl('Saving settings...', {type:'info', delay:1000, offset:{from:'top',amount:250}});
            } catch(err) {
                $.bootstrapGrowl('Unable to send settings to server', {type:'error', delay:3000, offset:{from:'top',amount:250}});
            }
            $('#settingsModal').modal('hide');
        });

        // Populate settings modal when opened
        $('#settingsModal').on('show.bs.modal', function(){
            $('#setting_temp_scale').val(temp_scale || 'c');
            $('#setting_kwh_rate').val(kwh_rate || 0.26);
            $('#setting_currency').val(currency_type || 'EUR');
        });

        // Control Socket ////////////////////////////////

        ws_control.onopen = function()
        {

        };

        ws_control.onmessage = function(e)
        {
            //Data from Simulation
            console.log ("control socket has been opened")
            console.log (e.data);
            x = JSON.parse(e.data);
            graph.live.data.push([x.runtime, x.temperature]);
            graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());

        }

        // Storage Socket ///////////////////////////////

        ws_storage.onopen = function()
        {
            ws_storage.send('GET');
        };


        ws_storage.onmessage = function(e)
        {
            message = JSON.parse(e.data);

            if(message.resp)
            {
                if(message.resp == "FAIL")
                {
                    if (confirm('Overwrite?'))
                    {
                        message.force=true;
                        console.log("Sending: " + JSON.stringify(message));
                        ws_storage.send(JSON.stringify(message));
                    }
                    else
                    {
                        //do nothing
                    }
                }

                return;
            }

            //the message is an array of profiles
            //FIXME: this should be better, maybe a {"profiles": ...} container?
            profiles = message;
            //delete old options in select
            $('#e2').find('option').remove().end();
            // check if current selected value is a valid profile name
            // if not, update with first available profile name
            var valid_profile_names = profiles.map(function(a) {return a.name;});
            if (
              valid_profile_names.length > 0 &&
              $.inArray(selected_profile_name, valid_profile_names) === -1
            ) {
              selected_profile = 0;
              selected_profile_name = valid_profile_names[0];
            }

            // fill select with new options from websocket
            for (var i=0; i<profiles.length; i++)
            {
                var profile = profiles[i];
                //console.log(profile.name);
                $('#e2').append('<option value="'+i+'">'+profile.name+'</option>');

                if (profile.name == selected_profile_name)
                {
                    selected_profile = i;
                    $('#e2').select2('val', i);
                    updateProfile(i);
                }
            }
        };


        $("#e2").select2(
        {
            placeholder: "Select Profile",
            allowClear: true,
            minimumResultsForSearch: -1
        });


        $("#e2").on("change", function(e)
        {
            updateProfile(e.val);
        });

        // file import input handler
        $("#importFile").on('change', function(e) {
            if (this.files && this.files[0]) {
                handleFileImport(this.files[0]);
                this.value = '';
            }
        });

    }
});

function triggerImport() {
    document.getElementById('importFile').click();
}

function handleFileImport(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
        var text = e.target.result;
        var name = file.name || 'imported-profile';

        if (name.toLowerCase().endsWith('.json')) {
            try {
                var obj = JSON.parse(text);
                if (obj.format && obj.format.indexOf('firing-schedule') !== -1 && obj.steps) {
                    // glaze-app.firing-schedule style
                    var profile = convertFiringScheduleToProfile(obj);
                    graph.profile.data = profile.data;
                    $('#form_profile_name').val(obj.program && obj.program.name ? obj.program.name : name.replace(/\.json$/i, ''));
                    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
                    updateProfileTable();
                    enterEditMode();
                }
                else if (obj.data && obj.name) {
                    // profile.json format used by app
                    graph.profile.data = obj.data;
                    $('#form_profile_name').val(obj.name);
                    graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
                    updateProfileTable();
                    enterEditMode();
                }
                else {
                    $.bootstrapGrowl('Unknown JSON format', {type:'error', delay:4000, offset:{from:'top',amount:250}});
                }
            }
            catch(err) {
                $.bootstrapGrowl('Invalid JSON file', {type:'error', delay:4000, offset:{from:'top',amount:250}});
            }
        }
        else if (name.toLowerCase().endsWith('.csv')) {
            var steps = parseCsvSchedule(text);
            if (steps && steps.length>0) {
                var profile = convertStepsToProfile(steps, name.replace(/\.csv$/i, ''));
                graph.profile.data = profile.data;
                $('#form_profile_name').val(profile.name || name.replace(/\.csv$/i, ''));
                graph.plot = $.plot("#graph_container", [ graph.profile, graph.live ] , getOptions());
                updateProfileTable();
                // enter edit mode; if autosave is enabled, save after a short delay
                enterEditMode();
                if ($('#autosave_after_import').is(':checked')) {
                    setTimeout(function(){
                        // call saveProfile to persist via existing websocket
                        saveProfile();
                    }, 500);
                }
            }
            else {
                $.bootstrapGrowl('CSV parsing failed', {type:'error', delay:4000, offset:{from:'top',amount:250}});
            }
        }
        else {
            $.bootstrapGrowl('Unsupported file type', {type:'error', delay:4000, offset:{from:'top',amount:250}});
        }
    };
    reader.readAsText(file);
}

function parseCsvSchedule(text) {
    var lines = text.split(/\r?\n/).filter(function(l){return l.trim().length>0});
    if (lines.length <= 1) return [];
    var header = lines[0].split(',').map(function(h){return h.trim().toLowerCase();});
    var rows = [];
    for (var i=1;i<lines.length;i++) {
        var cols = lines[i].split(',');
        if (cols.length < 7) continue;
        var row = {};
        row.step = cols[0].trim();
        row.phase = cols[1].trim();
        row.rate_c_per_hr = cols[2].trim();
        row.rate_f_per_hr = cols[3].trim();
        row.target_c = cols[4].trim();
        row.target_f = cols[5].trim();
        row.hold_min = cols[6].trim();
        row.note = cols.slice(7).join(',').trim();
        rows.push(row);
    }
    return rows;
}

function convertFiringScheduleToProfile(obj) {
    var steps = obj.steps || [];
    return convertStepsToProfile(steps, obj.program && obj.program.name ? obj.program.name : 'imported');
}

function convertStepsToProfile(steps, name) {
    var data = [];
    var currentTemp = 25;
    var currentTime = 0;
    var defaultHeatRate = 200; // C per hour for typical heat ramps
    var defaultCoolRate = 50;  // C per hour for natural cool approximation

    data.push([0, currentTemp]);

    for (var i=0;i<steps.length;i++) {
        var s = steps[i];
        // accept both CSV-parsed rows and firing-schedule step objects

        // target temp: accept multiple key names and Fahrenheit fallback
        var target = null;
        if (typeof s.target_c !== 'undefined') target = parseFloat(s.target_c);
        if ((target === null || isNaN(target)) && typeof s.targetTempC !== 'undefined') target = parseFloat(s.targetTempC);
        if ((target === null || isNaN(target)) && typeof s.target_c !== 'undefined') target = parseFloat(s.target_c);
        if ((target === null || isNaN(target)) && typeof s.target_c_per_hr !== 'undefined') target = parseFloat(s.target_c_per_hr);
        // try Fahrenheit fields
        if ((target === null || isNaN(target)) && typeof s.target_f !== 'undefined') {
            var tf = parseFloat(s.target_f);
            if (!isNaN(tf)) target = (5/9)*(tf-32);
        }
        if ((target === null || isNaN(target)) && typeof s.targetTempF !== 'undefined') {
            var tf2 = parseFloat(s.targetTempF);
            if (!isNaN(tf2)) target = (5/9)*(tf2-32);
        }

        if (target === null || isNaN(target)) continue;

        // determine rate (C per hour). Accept strings like 'FULL' or numbers in C or F.
        var rate = null;
        if (typeof s.rate_c_per_hr !== 'undefined' && s.rate_c_per_hr !== null) {
            var tmp = parseFloat(s.rate_c_per_hr);
            if (!isNaN(tmp)) rate = tmp; else if (String(s.rate_c_per_hr).toUpperCase().indexOf('FULL')!==-1) rate = null;
        }
        if ((rate === null || isNaN(rate)) && typeof s.rateCPerHour !== 'undefined') {
            var tmp2 = parseFloat(s.rateCPerHour);
            if (!isNaN(tmp2)) rate = tmp2;
        }
        // fallback to F/hr if present
        if ((rate === null || isNaN(rate)) && typeof s.rate_f_per_hr !== 'undefined') {
            var rf = parseFloat(s.rate_f_per_hr);
            if (!isNaN(rf)) rate = rf * 5/9; // convert F/hr to C/hr
        }

        // if still null, choose default heat/cool rate depending on direction
        var delta = target - currentTemp;
        if (rate === null || isNaN(rate)) {
            if (delta >= 0) rate = defaultHeatRate; else rate = defaultCoolRate;
        }

        var duration = 0;
        if (rate > 0) duration = Math.abs(delta)/rate * 3600;

        currentTime += Math.round(duration);
        data.push([Math.round(currentTime), Math.round(target)]);

        // hold minutes
        var hold = 0;
        if (typeof s.hold_min !== 'undefined') hold = parseFloat(s.hold_min) || 0;
        if (typeof s.holdMinutes !== 'undefined') hold = parseFloat(s.holdMinutes) || hold;
        if (hold > 0) {
            currentTime += Math.round(hold*60);
            data.push([Math.round(currentTime), Math.round(target)]);
        }

        currentTemp = target;
    }

    return { name: name, data: data };
}

function exportProfileToJSON() {
    var prof = graph.profile.data || [];
    if (!prof || prof.length===0) { $.bootstrapGrowl('No profile data to export', {type:'error'}); return; }
    var steps = [];
    for (var i=1;i<prof.length;i++) {
        var prev = prof[i-1]; var cur = prof[i];
        var deltaTemp = cur[1]-prev[1];
        var deltaTime = (cur[0]-prev[0]);
        var rate = deltaTime>0 ? Math.abs(deltaTemp)/(deltaTime/3600) : null;
        var phase = deltaTemp>=0 ? 'Heat' : 'Cool';
        steps.push({ step: i, phase: phase, rateCPerHour: rate===null?null:Math.round(rate), targetTempC: cur[1], holdMinutes: 0 });
    }
    var program = {
        name: $('#form_profile_name').val() || selected_profile_name || 'exported',
        length: 'short',
        cone: '',
        atmosphere: '',
        coolingStrategy: 'Natural cool',
        peakTempC: Math.max.apply(null, prof.map(function(p){return p[1]})),
        peakTempF: null,
        heatingHours: null,
        coolingHours: null,
        estimatedHours: null
    };
    var out = { format: 'glaze-app.firing-schedule', version: 1, exportedAt: new Date().toISOString(), program: program, steps: steps, notes: [] };
    downloadFile(JSON.stringify(out, null, 2), (program.name || 'profile') + '.firing-schedule.json');
}

function exportProfileToCSV() {
    var prof = graph.profile.data || [];
    if (!prof || prof.length===0) { $.bootstrapGrowl('No profile data to export', {type:'error'}); return; }
    var lines = [];
    lines.push('step,phase,rate_c_per_hr,rate_f_per_hr,target_c,target_f,hold_min,note');
    for (var i=1;i<prof.length;i++) {
        var prev = prof[i-1]; var cur = prof[i];
        var deltaTemp = cur[1]-prev[1];
        var deltaTime = (cur[0]-prev[0]);
        var rate = deltaTime>0 ? Math.abs(deltaTemp)/(deltaTime/3600) : '';
        var phase = deltaTemp>=0 ? 'Heat' : 'Cool';
        var rateField = (phase=='Cool' && (!rate || rate==0)) ? 'FULL' : (rate?Math.round(rate):'');
        lines.push([i, phase, rateField, '', cur[1], '', 0, ''].join(','));
    }
    var csv = lines.join('\n');
    var name = ($('#form_profile_name').val() || selected_profile_name || 'profile') + '.csv';
    downloadFile(csv, name);
}

function downloadFile(content, filename) {
    var blob = new Blob([content], {type: 'application/octet-stream'});
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        var a = document.createElement('a');
        var url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function(){document.body.removeChild(a); window.URL.revokeObjectURL(url);}, 100);
    }
}

// Graph interaction helpers: double-click to add, middle-click to remove, and
// ensure points are re-ordered after dragging.
$(function bindGraphInteractions(){
    var container = $('#graph_container');

    // Double-click to add a point at the clicked position (only in edit mode)
    container.on('dblclick', function(ev){
        if (state !== 'EDIT') return;
        if (!graph.plot) return;
        var plot = graph.plot;
        var plotOffset = plot.getPlotOffset();
        var offset = container.offset();
        var canvasX = ev.pageX - offset.left - plotOffset.left;
        var canvasY = ev.pageY - offset.top - plotOffset.top;
        var axes = plot.getAxes();
        var ax = axes.xaxis;
        var ay = axes.yaxis;
        var newx = Math.floor(ax.min + (canvasX)/ax.scale);
        var newy = Math.floor(ay.max - (canvasY)/ay.scale);

        // Snap to nearest minute and nearest degree
        var snapSeconds = 60; // minute grid
        newx = Math.round(newx / snapSeconds) * snapSeconds;
        newy = Math.round(newy); // nearest degree

        // Ensure unique time value (avoid exact duplicates)
        var exists = true;
        while (exists) {
            exists = false;
            for (var j=0;j<graph.profile.data.length;j++) { if (graph.profile.data[j][0] === newx) { exists = true; newx += 1; break; } }
        }

        // Insert keeping order by time
        var inserted = false;
        for (var i=0;i<graph.profile.data.length;i++) {
            if (newx < graph.profile.data[i][0]) {
                graph.profile.data.splice(i,0,[newx,newy]);
                inserted = true; break;
            }
        }
        if (!inserted) graph.profile.data.push([newx,newy]);

        graph.plot = $.plot('#graph_container', [ graph.profile, graph.live ], getOptions());
        updateProfileTable();
    });

    // Hover indicator: hollow circle showing the projected point on the profile line
    var hoverEl = $('<div id="edit-hover"></div>').css({
        position: 'absolute',
        width: '14px',
        height: '14px',
        'border-radius': '50%',
        'border': '2px solid rgba(0,128,0,0.9)',
        'background': 'transparent',
        'pointer-events': 'none',
        display: 'none',
        transform: 'translate(-50%,-50%)',
        'z-index': 1000
    }).appendTo('body');

    container.on('mousemove', function(ev){
        if (state !== 'EDIT') { hoverEl.hide(); return; }
        if (!graph.plot) { hoverEl.hide(); return; }
        var plot = graph.plot;
        var plotOffset = plot.getPlotOffset();
        var offset = container.offset();
        var canvasX = ev.pageX - offset.left - plotOffset.left;
        var canvasY = ev.pageY - offset.top - plotOffset.top;
        var axes = plot.getAxes();
        var ax = axes.xaxis;
        var ay = axes.yaxis;

        var timeCoord = Math.floor(ax.min + (canvasX)/ax.scale);
        // Snap timeCoord to minute grid for indicator
        var snapSeconds = 60;
        var snappedTime = Math.round(timeCoord / snapSeconds) * snapSeconds;

        // interpolate temperature at snappedTime from profile data
        var prof = graph.profile.data;
        if (!prof || prof.length === 0) { hoverEl.hide(); return; }
        var tempAt = prof[0][1];
        if (snappedTime <= prof[0][0]) {
            tempAt = prof[0][1];
        } else if (snappedTime >= prof[prof.length-1][0]) {
            tempAt = prof[prof.length-1][1];
        } else {
            for (var k=0;k<prof.length-1;k++) {
                var a = prof[k]; var b = prof[k+1];
                if (snappedTime >= a[0] && snappedTime <= b[0]) {
                    var frac = (snappedTime - a[0]) / (b[0]-a[0]);
                    tempAt = a[1] + frac*(b[1]-a[1]);
                    break;
                }
            }
        }
        var snappedTemp = Math.round(tempAt);

        // convert snappedTime/snappedTemp back to canvas coords
        // Convert plot coords to page coords, then position hover element (appended to body)
        var cx = ax.p2c(snappedTime) + plotOffset.left + offset.left;
        var cy = ay.p2c(snappedTemp) + plotOffset.top + offset.top;
        hoverEl.css({ left: cx + 'px', top: cy + 'px', display: 'block' });
        // debug visibility
        //console.log('hover at', snappedTime, snappedTemp, cx, cy);
    });

    container.on('mouseleave', function(){ hoverEl.hide(); });

    // Middle-click to remove a nearby point (only in edit mode)
    container.on('mousedown', function(ev){
        if (state !== 'EDIT') return;
        if (ev.which !== 2) return; // middle mouse
        ev.preventDefault(); ev.stopPropagation();
        if (!graph.plot) return;
        var plot = graph.plot;
        var plotOffset = plot.getPlotOffset();
        var offset = container.offset();
        var canvasX = ev.pageX - offset.left - plotOffset.left;
        var canvasY = ev.pageY - offset.top - plotOffset.top;

        var item = plot.findNearbyItem(canvasX, canvasY, function(s){ return true; });
        if (item) {
            var sidx = item.seriesIndex;
            var didx = item.dataIndex;
            if (sidx === 0) {
                graph.profile.data.splice(didx,1);
                graph.plot = $.plot('#graph_container', [ graph.profile, graph.live ], getOptions());
                updateProfileTable();
            }
        }
        return false;
    });

    // When the draggable plugin finishes a drag, ensure series data are sorted
    container.on('plotFinalSeriesChange', function(ev, sidx, didx, x, y){
        // Only care about profile series (index 0)
        try {
            if (!graph.plot) return;
            var s = graph.plot.getData()[sidx];
            if (!s || !s.data) return;
            // sort by time (x)
            s.data.sort(function(a,b){ return a[0] - b[0]; });
            // apply sorted data back to profile if it's the profile series
            if (sidx === 0) {
                // Snap final dragged point to grid (nearest minute and degree)
                var snapSeconds = 60;
                for (var ii=0; ii<s.data.length; ii++) {
                    s.data[ii][0] = Math.round(s.data[ii][0] / snapSeconds) * snapSeconds;
                    s.data[ii][1] = Math.round(s.data[ii][1]);
                }
                graph.profile.data = s.data.slice(0);
            }
            graph.plot = $.plot('#graph_container', [ graph.profile, graph.live ], getOptions());
            updateProfileTable();
        } catch(err) {
            console.log('Error reordering after drag', err);
        }
    });

    // Snap while dragging: plugin triggers plotSeriesChange with interim values
    container.on('plotSeriesChange', function(ev, sidx, didx, retx, rety) {
        if (state !== 'EDIT') return;
        try {
            if (!graph.plot) return;
            if (sidx !== 0) return;
            var snapSeconds = 60;
            var snappedX = Math.round(retx / snapSeconds) * snapSeconds;
            var snappedY = Math.round(rety);

            var s = graph.plot.getData()[sidx];
            if (!s || !s.data) return;
            if (didx >= 0 && didx < s.data.length) {
                s.data[didx][0] = snappedX;
                s.data[didx][1] = snappedY;
                graph.profile.data = s.data.slice(0);
                graph.plot = $.plot('#graph_container', [ graph.profile, graph.live ], getOptions());
                updateProfileTable();
            }
        } catch(err) {
            console.log('Error snapping during drag', err);
        }
    });

    console.log('picoreflow: graph interactions bound (dblclick add, middle-delete, drag reorder)');
});
