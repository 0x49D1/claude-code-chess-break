"""Turns `tmux capture-pane -e -p` frames into an SVG for the README: one frame still, several animated.

    python3 scripts/terminal_svg.py out.svg --columns 84:150 --rows 1:20 a.ans:2.5 b.ans:1 ...

Each frame is `file:seconds`. Columns and rows crop the terminal (start inclusive, end exclusive).
"""

import argparse
import html
import re
import unicodedata

FONT_SIZE = 14
CELL = 8.4  # a monospace cell at FONT_SIZE
LINE = 19
FG, BG = '#d0d0d0', '#262626'
SGR = re.compile(r'\x1b\[([0-9;]*)m')
# Hyperlinks (OSC 8) and other OSC strings draw nothing.
OSC = re.compile(r'\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)')


def xterm(n: int) -> str:
    """One of the 256 xterm colours."""
    base = ['#000000', '#cd0000', '#00cd00', '#cdcd00', '#0000ee', '#cd00cd', '#00cdcd', '#e5e5e5',
            '#7f7f7f', '#ff0000', '#00ff00', '#ffff00', '#5c5cff', '#ff00ff', '#00ffff', '#ffffff']
    if n < 16:
        return base[n]
    if n < 232:
        n -= 16
        level = [0, 95, 135, 175, 215, 255]
        return '#%02x%02x%02x' % (level[n // 36], level[n // 6 % 6], level[n % 6])
    grey = 8 + (n - 232) * 10
    return '#%02x%02x%02x' % (grey, grey, grey)


def width(ch: str) -> int:
    if unicodedata.combining(ch) or ch in '️‍':
        return 0
    return 2 if unicodedata.east_asian_width(ch) in 'WF' else 1


def is_plain(ch: str) -> bool:
    """Drawn in a run with its neighbours: ASCII and box drawing, which every monospace font has."""
    return len(ch) == 1 and (ord(ch) < 0x80 or 0x2500 <= ord(ch) < 0x2580)


def cells(line: str):
    """The line's cells: (column, text, style), a wide character filling two columns."""
    style = {'fg': None, 'bg': None, 'bold': False, 'dim': False, 'inverse': False}
    column, out = 0, []
    # split() alternates text and the codes it captured: odd parts are codes.
    for index, part in enumerate(SGR.split(OSC.sub('', line))):
        if index % 2:
            codes = [int(p) for p in part.split(';') if p] or [0]
            i = 0
            while i < len(codes):
                c = codes[i]
                if c == 0:
                    style = {'fg': None, 'bg': None, 'bold': False, 'dim': False, 'inverse': False}
                elif c == 1: style['bold'] = True
                elif c == 2: style['dim'] = True
                elif c == 7: style['inverse'] = True
                elif c == 22: style['bold'] = style['dim'] = False
                elif c == 27: style['inverse'] = False
                elif c == 39: style['fg'] = None
                elif c == 49: style['bg'] = None
                elif 30 <= c <= 37: style['fg'] = xterm(c - 30)
                elif 40 <= c <= 47: style['bg'] = xterm(c - 40)
                elif 90 <= c <= 97: style['fg'] = xterm(c - 82)
                elif c in (38, 48) and i + 1 < len(codes):
                    key = 'fg' if c == 38 else 'bg'
                    if codes[i + 1] == 5 and i + 2 < len(codes):
                        style[key] = xterm(codes[i + 2]); i += 2
                    elif codes[i + 1] == 2 and i + 4 < len(codes):
                        style[key] = '#%02x%02x%02x' % tuple(codes[i + 2:i + 5]); i += 4
                i += 1
            continue
        for ch in part:
            w = width(ch)
            if w == 0 and out:
                out[-1] = (out[-1][0], out[-1][1] + ch, out[-1][2])
                continue
            out.append((column, ch, dict(style)))
            column += w
    return out


def frame_svg(lines, columns, rows):
    """A frame's background rectangles and text, cropped."""
    shapes, texts = [], []
    for y, line in enumerate(lines[rows[0]:rows[1]]):
        run = None  # narrow characters of one style, drawn as one text
        def flush():
            if run:
                x, text, s = run
                fill = s['fg'] or FG
                weight = ' font-weight="bold"' if s['bold'] else ''
                opacity = ' opacity="0.6"' if s['dim'] else ''
                texts.append(f'<text x="{x * CELL:.1f}" y="{y * LINE + 14}" fill="{fill}"{weight}{opacity} '
                             f'textLength="{len(text) * CELL:.1f}" lengthAdjust="spacingAndGlyphs">{html.escape(text)}</text>')
        for column, ch, s in cells(line):
            if not columns[0] <= column < columns[1]:
                continue
            x = column - columns[0]
            fg, bg = (s['bg'] or BG, s['fg'] or FG) if s['inverse'] else (s['fg'], s['bg'])
            s = {**s, 'fg': fg}
            if bg and bg != BG:
                shapes.append(f'<rect x="{x * CELL:.1f}" y="{y * LINE}" width="{width(ch[0]) * CELL + 0.5:.1f}" height="{LINE}" fill="{bg}"/>')
            key = (s['fg'], s['bold'], s['dim'])
            if ch == ' ':
                # Spaces end a run and draw nothing: every run is placed by its own column.
                flush()
                run = None
                continue
            if is_plain(ch) and run and run[2] is not None and (run[2]['fg'], run[2]['bold'], run[2]['dim']) == key and run[0] + len(run[1]) == x:
                run = (run[0], run[1] + ch, run[2])
                continue
            flush()
            if is_plain(ch):
                run = (x, ch, s)
            else:
                run = None
                # A one-cell symbol (⏮, ♟) asks for its text form: its emoji form is two cells wide.
                glyph = ch + '\ufe0e' if width(ch[0]) == 1 else ch
                # Chess pieces drawn larger, over their two-cell square.
                size = ' font-size="19"' if 0x2654 <= ord(ch[0]) <= 0x265F else ''
                texts.append(f'<text x="{x * CELL:.1f}" y="{y * LINE + 15}" fill="{s["fg"] or FG}"{size}>{html.escape(glyph)}</text>')
        flush()
    return ''.join(shapes) + ''.join(texts)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('out')
    parser.add_argument('--columns', default='0:200')
    parser.add_argument('--rows', default='0:100')
    parser.add_argument('frames', nargs='+')
    args = parser.parse_args()
    columns = tuple(int(n) for n in args.columns.split(':'))
    rows = tuple(int(n) for n in args.rows.split(':'))
    frames = []
    for spec in args.frames:
        path, _, seconds = spec.rpartition(':')
        with open(path, encoding='utf-8') as f:
            frames.append((f.read().split('\n'), float(seconds)))
    w = (columns[1] - columns[0]) * CELL + 2 * 12
    h = (rows[1] - rows[0]) * LINE + 2 * 12
    total = sum(s for _, s in frames)
    style, groups, start = [], [], 0.0
    for i, (lines, seconds) in enumerate(frames):
        if len(frames) > 1:
            a, b = start / total * 100, (start + seconds) / total * 100
            # Shown from a% to b% of the loop, swapped without fading; for the first frame a is 0%, the later rule wins.
            style.append(f'@keyframes f{i}{{0%{{opacity:0}}{a:.3f}%{{opacity:1}}{b:.3f}%{{opacity:0}}100%{{opacity:0}}}}'
                         f'.f{i}{{opacity:0;animation:f{i} {total}s step-end infinite}}')
        groups.append(f'<g class="f{i}">{frame_svg(lines, columns, rows)}</g>')
        start += seconds
    css = ''.join(style)
    with open(args.out, 'w', encoding='utf-8') as f:
        f.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.0f} {h:.0f}" '
                f'font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,\'DejaVu Sans Mono\',monospace" font-size="{FONT_SIZE}">'
                f'<style>{css}</style><rect width="100%" height="100%" rx="8" fill="{BG}"/>'
                f'<g transform="translate(12 12)">{"".join(groups)}</g></svg>\n')


if __name__ == '__main__':
    main()
