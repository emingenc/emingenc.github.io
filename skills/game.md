# /game — Play deployed games

Run games Emin built. `/game` shows a selectable list; picking one launches it
(full-page navigation to the game).

## Usage

    /game                → list all games (selectable)
    /game <id>           → launch that game
    /game hack-overflow  → launch HACK://OVERFLOW

Keywords: game, play, playable, arcade, platformer, hack-overflow

## Games

| id             | name             | path            | what it is                                                     |
|----------------|------------------|-----------------|-----------------------------------------------------------------|
| hack-overflow  | HACK://OVERFLOW  | /hack-overflow/ | Blind-75 learning platformer — walk the route, hack firewalls   |

`public/hack-overflow/` holds the Godot web export copied verbatim from the
private `emingenc/hack-overflow` repo's GitHub `main`. See AGENTS.md for how
to refresh it.

## Adding a game

Append to the `GAMES` array in `agents/tools.js`. `path` is what `/game <id>`
navigates to — same-origin (e.g. `/<slug>/`) for a game published under
`public/<slug>/` in this repo, or a full URL for one hosted elsewhere. `url`
is the game's public address, kept for reference: nothing displays it, and
`/game <id>` falls back to it only when `path` is missing. It can be omitted
if it would just repeat `path`:

```js
{ id: '<slug>', name: '<TITLE>', path: '/<slug>/', url: 'https://emingenc.github.io/<repo>/', desc: '<one-line what it is>' }
```
