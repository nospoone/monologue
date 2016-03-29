![Monologue](https://raw.githubusercontent.com/nospoone/monologue/master/.github/header.png)

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE.md) [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

## About 

Monologue is a node-based conversation tree builder. 

![Screenshot](https://raw.githubusercontent.com/nospoone/monologue/master/.github/screenshot.png)

## Using

#### Editor

There are no public built binaries, yet. Clone the repository and check the **Developing** section below.

#### Readers

- [monologue-reader](<https://github.com/larsiusprime/monologue-reader>), parser & controller written in Haxe  _(created by the incredible [Lars Doucet](http://github.com/larsiusprime))_

If you want to implement your own, you can find the specs for the project files [here](<https://github.com/nospoone/monologue/wiki/Project-File-Format>).

## Developing

An installation of [nodejs](https://nodejs.org/en/) is required to develop Monologue.

First, install the dependencies:

`npm install gulp-cli -g && npm install`

To run Monologue:

`npm start`

The UI is HTML/CSS.

You can compile the Jade/LESS by running gulp:

`gulp {jade|less}`

Or watch for changes and compile automatically:

`gulp watch`

Enjoy! :thumbsup: