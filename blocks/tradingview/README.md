# TradingView block

Renders TradingView widgets from the structured content inserted by the
`tools/plugins/embedwidget` DA plugin. The plugin supports legacy TradingView
embed scripts and TradingView custom-element widgets.

## Content fields

- `script`: A legacy widget script filename (for example,
  `embed-widget-ticker-tape.js`) or an absolute URL to a supported
  `widgets.tradingview-widget.com` module script.
- `height`: CSS height for the widget block; defaults to `500px`.
- `config`: JSON configuration. Legacy widgets use TradingView's normal widget
  configuration. Module widgets use `{ "tagName": "tv-*", "attributes": {} }`.

The widget is inserted when it nears the viewport to defer loading third-party
scripts until needed. For authoring examples, use the EmbedWidget plugin.
