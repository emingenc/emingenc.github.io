# /game — Play deployed games

Run games Emin built and deployed to GitHub Pages. `/game` shows a selectable
list; picking one launches it.

## Usage

    /game                → list all games (selectable)
    /game <id>           → launch that game
    /game hack-overflow  → launch HACK://OVERFLOW

Keywords: game, play, playable, arcade, platformer, hack-overflow

## Games

| id             | name             | url                                          | what it is                          |
|----------------|------------------|----------------------------------------------|-------------------------------------|
| hack-overflow  | HACK://OVERFLOW  | https://emingenc.github.io/hack-overflow/    | Blind-75 learning platformer        |

## Adding a game

Append to the `GAMES` array in `agents/tools.js`:

```js
{ id: '<slug>', name: '<TITLE>', url: 'https://emingenc.github.io/<repo>/', desc: '<one-line what it is>' }
```

The game must be deployed to GitHub Pages (that's the whole trick — no server,
the portfolio just redirects to the live build).
