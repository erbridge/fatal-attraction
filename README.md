# Fatal Attraction

> A game about a close encounter with gravity

![title screen](/promo-art/title.png)

This is a game originally made for Ludum Dare 32. The theme was **An Unconventional Weapon**.


## Install

Either play [online](http://erbridge.co.uk/fatal-attraction/) or download the appropriate [distribution for your system](https://github.com/erbridge/fatal-attraction/releases).


## Develop

This game can be run directly in the browser, or run as a standalone executable using [Electron](http://electron.atom.io).


### Web

Since the site is hosted on GitHub Pages (hence `gh-pages` being the main branch), I use Jekyll when developing it. Any webserver would do, however.


#### Install

```
$ bundle install --path="./bundle"
```


#### Run

```
$ bundle exec jekyll serve --watch
```


### Electron

#### Install

```
$ npm install
```


#### Run

```
$ npm start
```


#### Build

```
$ npm run build
```


#### Distribute

```
$ npm run dist
```


### Assets

The raw audio assets can be found in `raw-assets/`, and are editable in:

- `.cpt` - [Chiptone](http://sfbgames.com/chiptone/)
- `.sunvox` - [SunVox](http://www.warmplace.ru/soft/sunvox/)
