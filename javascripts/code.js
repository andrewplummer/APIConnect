
/*
 * Requires: SHJS
 */


(function($){

  var timer;
  var builtElements = [];

  function buildHTML(el, code){
    var pre;
    if(el.hasClass('multi_line')){
      code = code.replace(/(function.*)\s?\{([\s\S]*)\}/m, '$1{_BR_$2_BR_}').replace(/(_BR_)\s*(?:<\/?br>)?/, '$1&nbsp;&nbsp');
      code = code.replace(/_BR_\n/, '_BR_').replace(/\n_BR_/, '_BR_');
    }
    if(el.hasClass('escape_html')){
      code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    var html = '<pre class="sh_javascript"';
    if(!el.hasClass('inactive')) {
      html += 'contentEditable="true"';
    }
    html += '>' + code + '</pre>';
    if(!el.hasClass('inactive') && !el.hasClass('multi_line') || el.hasClass('force_result')){
      html += '<div class="result monospace"><span class="prompt">&gt;</span><span class="output"></span></div>';
    }
    html = '<div class="stage">' + html + '</div>';
    if(!el.hasClass('inactive')) {
      html += '<div class="actions"><p><span class="edit">Edit</span><span class="reset">Reset</span><span class="run">Run</span><span class="shortcut_key"></span></div>';
    }
    if(el.hasClass('show_live')) {
      html += '<p class="live_marker">Live!</p>';
    }
    el.html(html);
    pre = $('pre', el);
    sh_highlightElement(pre.get(0), sh_languages['javascript']);
    html = pre.html().replace(/_BR_/g, '<br/>');
    pre.html(html);
    el.addClass('initialized');
    return html;
  }

  function runScript(code, output, defer, hideResult, inConsole){
    $(document).trigger('code.will_execute');
    try {
      var result = eval(code);
      if(result.getTime){
        result = result.format('{Weekday}, {Month} {day}, {year} {hh}:{mm}');
      }
      if(!defer && !hideResult){
        if(result.exec){
          output.text('/' + result.source + '/' + (result.global ? 'g' : '') + (result.ignoreCase ? 'i' : '') + (result.multiline ? 'm' : ''));
        } else {
          output.text(window.JSON ? JSON.stringify(result) : result.toString());
        }
      }
      if(inConsole && typeof console !== 'undefined') {
        console.log(result);
      }
      if(hideResult){
        output.parent('.result').hide();
      }
      $(document).trigger('code.executed', output);
    } catch(e){
      output.html('<span class="error">' + e.message + '</span>');
    }
    return false;
  }

  $.fn.activateCodeExample = function(){

    this.each(function(){

      var el = $(this);
      var code = el.html().replace(/_NL_/g, '\\n').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
      var markedUpCode = buildHTML(el, code);
      code = code.replace(/\{\s*\/\/.+?\}/m, '{}').replace(/<br>/g, '');

      // Have to unescape double escaped html for the sake of String#unescapeHTML
      code = code.replace(/&amp;/g, '&');

      var reset  = $('.reset', el);
      var edit   = $('.edit', el);
      var run    = $('.run', el);
      var pre    = $('pre', el);
      var output = $('.output', el);
      var key    = $('.shortcut_key', el);
      var defer  = el.hasClass('defer');
      var hideResult = el.hasClass('hide_result') && !el.hasClass('force_result');
      var inConsole = el.hasClass('console');

      run.click(function(){
        runScript(pre.text(), output, defer, hideResult, inConsole);
      });

      edit.click(function(){
        pre.focus();
      });

      reset.click(function(){
        pre.html(markedUpCode);
        if(!el.hasClass('no_autorun')) {
          runScript(code, output, defer, hideResult, inConsole);
        }
      });

      reset.mouseover(function(){
        key.text('Esc').show();
        return false;
      });

      run.mouseover(function(){
        key.text('^Enter').show();
        return false;
      });

      el.mouseover(function(){
        key.text('').hide();
      });

      pre.keydown(function(e){
        if(e.keyCode == 13 && (e.ctrlKey || e.metaKey)){
          run.click();
          return false;
        }
        if(e.keyCode == 27){
          reset.click();
        }
      });

      if(!el.hasClass('no_autorun')) {
        runScript(code, output, defer, hideResult, inConsole);
      }

    });

  }


})(jQuery);

