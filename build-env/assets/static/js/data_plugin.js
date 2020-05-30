(() => {
  const __HISTORY_MAX = 64;
  const __history = [];
  let __history_cur = 0;

  function __callFunc(command) {
    return async (...args) => {
      return (
        await axios.post(
          'db',
          {
            command,
            plugin: $('#shell-command').attr('data-plugin'),
            args,
          },
          { timeout: 10000 }
        )
      ).data;
    };
  }

  const DB = {
    Count: __callFunc('Count'),
    Find: __callFunc('Find'),
    FindOne: __callFunc('FindOne'),
    Insert: __callFunc('Insert'),
    Remove: __callFunc('Remove'),
    Update: __callFunc('Update'),
    Upsert: __callFunc('Upsert'),
  };

  function clear() {
    $('#shell-content').html('');
    return { __cleared: true };
  }

  Object.freeze(DB);

  let __auto_command_store = null;
  const __AUTO_KW = {
    '': ['clear'],
    'DB': Object.keys(DB),
  };
  let __auto_starts = 0;

  $('#shell-command').on('keydown', async e => {
    if (e.code == 'Enter') {
      e.preventDefault();
      __history_cur = 0;
      const command = $('#shell-command').val();

      if (command == null || command.length == '') {
        return;
      }

      $('#shell-command').prop('disabled', true);
      __history.push(command);

      if (__history.length > __HISTORY_MAX) {
        __history.slice(__history.length - __HISTORY_MAX, __history.length);
      }

      let result = '';
      try {
        result = await eval(command);
      } catch (err) {
        result = { error: err.toString() };
      }

      if (result !== DB && (result == null || !result.__cleared)) {
        $('#shell-content').append(
          `<code class="language-json hljs">${
            hljs.highlight('json', `/* ${command} */\n${JSON.stringify(result, null, 2)}`).value
          }</code>`
        );
      }
      $('#shell-command').val('');
      $('#shell-command').prop('disabled', false);
      $('#shell-command').focus();
    } else if (e.code == 'ArrowUp') {
      e.preventDefault();
      //Up
      if (__history_cur < Math.min(__HISTORY_MAX, __history.length)) {
        __history_cur += 1;
        $('#shell-command').val(__history[__history.length - __history_cur]);
      }
    } else if (e.code == 'ArrowDown') {
      e.preventDefault();
      //Down
      if (__history_cur > 0) {
        __history_cur -= 1;
        if (__history_cur == 0) $('#shell-command').val('');
        else $('#shell-command').val(__history[__history.length - __history_cur]);
      }
    } else if (e.code == 'Tab') {
      e.preventDefault();
      let start = $('#shell-command').prop('selectionStart');
      let end = $('#shell-command').prop('selectionEnd');
      if (start != end) {
        return;
      }

      let input = $('#shell-command').val();

      if (__auto_command_store == null) {
        __auto_command_store = { command: input, cursor: end };
      } else {
        input = __auto_command_store.command;
        end = __auto_command_store.cursor;
      }

      const findSep = (seps, end) => {
        for (let cur = end - 1; cur >= -1; --cur) {
          if (seps.indexOf(input[cur]) >= 0) {
            return cur;
          }
        }
        return -1;
      };

      const cur = findSep([undefined, ' ', ',', '.', ';'], end);
      let namespace = '';
      if (input[cur] == '.') {
        const cur2 = findSep([undefined, ' ', ',', ';'], cur);
        const _ns = input.slice(cur2 + 1, cur);
        if (__AUTO_KW[_ns]) {
          namespace = _ns;
        }
      }

      for (let i = 0; i < __AUTO_KW[namespace].length; ++i) {
        const index = (__auto_starts + i) % __AUTO_KW[namespace].length;
        if (
          __AUTO_KW[namespace][index]
            .toLowerCase()
            .startsWith(input.slice(cur + 1, end).toLowerCase())
        ) {
          input = input.slice(0, cur + 1) + __AUTO_KW[namespace][index] + '()' + input.slice(end);
          __auto_starts = (index + 1) % __AUTO_KW[namespace].length;
          start = end = cur + 1 + __AUTO_KW[namespace][index].length + 1;
          break;
        }
      }

      $('#shell-command').val(input);

      $('#shell-command').prop('selectionStart', start);
      $('#shell-command').prop('selectionEnd', end);
    }
  });

  $('#shell-command').on('input', e => {
    __auto_command_store = null;
    __auto_starts = 0;
    if (e.originalEvent.inputType != 'insertText') {
      return;
    }
    const keywords = Object.keys(DB)
      .map(k => `DB.${k}(`)
      .concat('DB.');

    let start = $('#shell-command').prop('selectionStart');
    let end = $('#shell-command').prop('selectionEnd');
    if (start != end) {
      return;
    }

    let input = $('#shell-command').val();

    const sep = [undefined, ' ', ',', '.', ';'];
    for (const kw of keywords) {
      if (
        input.substr(end - kw.length, end).toLowerCase() == kw.toLowerCase() &&
        sep.indexOf(input[end - kw.length - 1]) >= 0
      ) {
        input = input.slice(0, end - kw.length) + kw + input.slice(end);
      }
    }

    const fillRight = {
      '(': ')',
      '{': '}',
      '[': ']',
      '"': '"',
      "'": "'",
      '`': '`',
    };

    if (input[end - 1] in fillRight) {
      input = input.slice(0, end) + fillRight[input[end - 1]] + input.slice(end);
    }

    if (Object.values(fillRight).indexOf(input[end]) >= 0 && input[end - 1] == input[end]) {
      input = input.slice(0, end - 1) + input.slice(end);
    }

    $('#shell-command').val(input);

    $('#shell-command').prop('selectionStart', start);
    $('#shell-command').prop('selectionEnd', end);
  });
})();
