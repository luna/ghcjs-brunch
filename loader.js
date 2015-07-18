$("body").append('<pre id="log" style="position:absolute;z-index:-10; width:100%; height: 100; overflow: auto; white-space: pre-wrap; word-wrap: break-word; ">Connecting…\n</pre>');
var rs = io("http://localhost:9886");
rs.emit("reload");
rs.on('stdout', function(msg) {
    $('#log').append(msg);
});