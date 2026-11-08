'use strict';

// These rules run before Markdown's backslash escape rule. Replacing text before
// parsing would also rewrite examples inside fenced code and inline code spans.
function escaped(source, pos) {
  let slashes = 0;
  while (pos > 0 && source[--pos] === '\\') slashes++;
  return slashes % 2 === 1;
}

function closingDelimiter(source, close, start, end) {
  let pos = source.indexOf(close, start);
  while (pos !== -1 && pos < end) {
    if (!escaped(source, pos)) return pos;
    pos = source.indexOf(close, pos + 2);
  }
  return -1;
}

module.exports = function mathDelimiters(md) {
  md.inline.ruler.before('escape', 'math_double_dollar_inline', (state, silent) => {
    const start = state.pos;
    if (state.src.slice(start, start + 2) !== '$$') return false;
    const end = closingDelimiter(state.src, '$$', start + 2, state.posMax);
    if (end < 0 || !state.src.slice(start + 2, end).trim()) return false;
    if (!silent) {
      const token = state.push('math_display_inline', 'math', 0);
      token.content = state.src.slice(start + 2, end);
      token.markup = '$$';
    }
    state.pos = end + 2;
    return true;
  });

  md.inline.ruler.before('escape', 'math_brackets_inline', (state, silent) => {
    const start = state.pos;
    const opening = state.src.slice(start, start + 2);
    if (opening !== '\\(' && opening !== '\\[') return false;
    const close = opening === '\\(' ? '\\)' : '\\]';
    const end = closingDelimiter(state.src, close, start + 2, state.posMax);
    if (end < 0 || !state.src.slice(start + 2, end).trim()) return false;
    if (!silent) {
      const token = state.push(opening === '\\(' ? 'math_inline' : 'math_display_inline', 'math', 0);
      token.content = state.src.slice(start + 2, end);
      token.markup = opening;
    }
    state.pos = end + 2;
    return true;
  });

  md.block.ruler.after('blockquote', 'math_brackets_block', (state, start, end, silent) => {
    const opening = state.bMarks[start] + state.tShift[start];
    if (state.src.slice(opening, opening + 2) !== '\\[') return false;
    if (state.sCount[start] - state.blkIndent >= 4) return false;
    for (let line = start; line < end; line++) {
      const pos = state.bMarks[line] + state.tShift[line];
      const max = state.eMarks[line];
      if (line > start && pos < max && state.tShift[line] < state.blkIndent) break;
      const close = closingDelimiter(state.src, '\\]', line === start ? opening + 2 : pos, max);
      if (close === -1) continue;
      // A formula sharing its last line with prose belongs to the inline rule.
      if (state.src.slice(close + 2, max).trim()) return false;
      const content = line === start ? state.src.slice(opening + 2, close) :
        state.src.slice(opening + 2, state.eMarks[start]) + '\n' +
        state.getLines(start + 1, line, state.tShift[start], true) + state.src.slice(pos, close);
      if (!content.trim()) return false;
      if (!silent) {
        const token = state.push('math_block', 'math', 0);
        token.block = true;
        token.content = content;
        token.markup = '\\[';
        token.map = [start, line + 1];
        state.line = line + 1;
      }
      return true;
    }
    return false;
  }, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });

  md.renderer.rules.math_display_inline = (...args) => md.renderer.rules.math_block(...args);
};
